from dataclasses import dataclass
from typing import Any

from app.audit.service import AuditService
from app.cleaning.repository import CleaningRepository
from app.cleaning.schemas import (
    CleaningPreviewRequest,
    CleaningPreviewResponse,
    CleaningRecipeCreateRequest,
    CleaningRecipeListResponse,
    CleaningRecipeResponse,
    CleaningStepRequest,
    CleaningStepResponse,
)
from app.core.errors import AppError
from app.core.ids import new_id
from app.datasets.service import Dataset, DatasetService, dataset_service
from app.models.cleaning import CleaningRecipe as CleaningRecipeModel
from app.models.cleaning import CleaningStep as CleaningStepModel


@dataclass(frozen=True)
class CleaningRecipe:
    id: str
    project_id: str
    source_dataset_id: str
    name: str
    description: str | None
    steps: list[CleaningStepResponse]


class CleaningService:
    def __init__(
        self,
        repository: CleaningRepository | None = None,
        datasets: DatasetService = dataset_service,
        audit: AuditService | None = None,
    ) -> None:
        self.repository = repository
        self.datasets = datasets
        self.audit = audit
        self._recipes: dict[str, CleaningRecipe] = {}

    def reset(self) -> None:
        self._recipes = {}

    def create_recipe(self, payload: CleaningRecipeCreateRequest) -> CleaningRecipeResponse:
        dataset = self._get_project_dataset(
            project_id=payload.project_id,
            dataset_id=payload.source_dataset_id,
        )
        ordered_steps = self._validate_steps(payload.steps, dataset=dataset)
        recipe_id = new_id("clean")
        steps = [
            CleaningStepResponse(
                id=new_id("cstep"),
                operation=step.operation,
                order=step.order,
                config=step.config,
            )
            for step in ordered_steps
        ]

        if self.repository is not None:
            recipe = CleaningRecipeModel(
                id=recipe_id,
                project_id=payload.project_id,
                source_dataset_id=payload.source_dataset_id,
                name=payload.name,
                description=payload.description,
            )
            self.repository.save_recipe(
                recipe=recipe,
                steps=[
                    CleaningStepModel(
                        id=step.id,
                        recipe_id=recipe_id,
                        operation=step.operation,
                        order=step.order,
                        config=step.config,
                    )
                    for step in steps
                ],
            )
            response = self._model_to_response(recipe)
            self._record_recipe_audit(response)
            return response

        recipe = CleaningRecipe(
            id=recipe_id,
            project_id=payload.project_id,
            source_dataset_id=payload.source_dataset_id,
            name=payload.name,
            description=payload.description,
            steps=steps,
        )
        self._recipes[recipe.id] = recipe
        return to_recipe_response(recipe)

    def list_recipes(self, project_id: str) -> CleaningRecipeListResponse:
        if self.repository is None:
            recipes = [
                to_recipe_response(recipe)
                for recipe in self._recipes.values()
                if recipe.project_id == project_id
            ]
            return CleaningRecipeListResponse(items=recipes)

        return CleaningRecipeListResponse(
            items=[
                self._model_to_response(model) for model in self.repository.list_recipes(project_id)
            ]
        )

    def get_recipe(self, recipe_id: str) -> CleaningRecipeResponse:
        if self.repository is None:
            recipe = self._recipes.get(recipe_id)
            if recipe is None:
                raise AppError("Cleaning recipe not found", "cleaning_recipe_not_found", 404)
            return to_recipe_response(recipe)

        model = self.repository.get_recipe(recipe_id)
        if model is None:
            raise AppError("Cleaning recipe not found", "cleaning_recipe_not_found", 404)
        return self._model_to_response(model)

    def preview(self, payload: CleaningPreviewRequest) -> CleaningPreviewResponse:
        dataset = self._get_project_dataset(
            project_id=payload.project_id,
            dataset_id=payload.source_dataset_id,
        )
        steps = self._validate_steps(payload.steps, dataset=dataset)
        _, rows = self.datasets.preview_dataset_rows(
            dataset_id=dataset.id,
            page=payload.page,
            page_size=payload.page_size,
        )
        cleaned_rows = apply_cleaning_steps(rows, steps)
        fields = infer_preview_fields(dataset=dataset, rows=cleaned_rows)

        return CleaningPreviewResponse(
            source_dataset_id=dataset.id,
            page=payload.page,
            page_size=payload.page_size,
            total_rows=len(cleaned_rows),
            fields=fields,
            rows=cleaned_rows,
        )

    def _model_to_response(self, model: CleaningRecipeModel) -> CleaningRecipeResponse:
        steps = [
            CleaningStepResponse(
                id=step.id,
                operation=step.operation,
                order=step.order,
                config=step.config,
            )
            for step in self.repository.list_steps(model.id)
        ]
        return CleaningRecipeResponse(
            id=model.id,
            project_id=model.project_id,
            source_dataset_id=model.source_dataset_id,
            name=model.name,
            description=model.description,
            steps=steps,
        )

    def _get_project_dataset(self, *, project_id: str, dataset_id: str) -> Dataset:
        dataset = self.datasets.get_dataset(dataset_id)
        if dataset.project_id != project_id:
            raise AppError("Dataset not found in project", "dataset_not_found", 404)
        return dataset

    def _validate_steps(
        self,
        steps: list[CleaningStepRequest],
        *,
        dataset: Dataset,
    ) -> list[CleaningStepRequest]:
        ordered_steps = sorted(steps, key=lambda step: step.order)
        field_names = {field.name for field in dataset.fields}
        current_names = set(field_names)

        for step in ordered_steps:
            if step.operation == "rename_field":
                source = require_string_config(step, "source_field")
                target = require_string_config(step, "target_field")
                if source not in current_names:
                    raise AppError("Source field does not exist", "invalid_cleaning_step", 400)
                if not target.strip():
                    raise AppError("Target field cannot be empty", "invalid_cleaning_step", 400)
                current_names.remove(source)
                current_names.add(target)
            elif step.operation == "fill_null":
                field = require_string_config(step, "field")
                if field not in current_names:
                    raise AppError("Fill-null field does not exist", "invalid_cleaning_step", 400)
                if "value" not in step.config:
                    raise AppError("Fill-null value is required", "invalid_cleaning_step", 400)
            elif step.operation == "drop_null_rows":
                fields = require_string_list_config(step, "fields")
                if not set(fields).issubset(current_names):
                    raise AppError("Drop-null fields must exist", "invalid_cleaning_step", 400)
            elif step.operation == "deduplicate":
                fields = require_string_list_config(step, "fields")
                if not set(fields).issubset(current_names):
                    raise AppError("Deduplicate fields must exist", "invalid_cleaning_step", 400)

        return ordered_steps

    def _record_recipe_audit(self, recipe: CleaningRecipeResponse) -> None:
        if self.audit is None:
            return

        self.audit.record_operation(
            action="cleaning.recipe_created",
            project_id=recipe.project_id,
            resource_type="cleaning_recipe",
            resource_id=recipe.id,
            detail={
                "source_dataset_id": recipe.source_dataset_id,
                "step_count": len(recipe.steps),
            },
        )
        self.audit.record_lineage(
            project_id=recipe.project_id,
            source_type="dataset",
            source_id=recipe.source_dataset_id,
            target_type="cleaning_recipe",
            target_id=recipe.id,
            transform_type="cleaning_recipe",
            transform_id=recipe.id,
        )


def to_recipe_response(recipe: CleaningRecipe) -> CleaningRecipeResponse:
    return CleaningRecipeResponse(
        id=recipe.id,
        project_id=recipe.project_id,
        source_dataset_id=recipe.source_dataset_id,
        name=recipe.name,
        description=recipe.description,
        steps=recipe.steps,
    )


def require_string_config(step: CleaningStepRequest, key: str) -> str:
    value = step.config.get(key)
    if not isinstance(value, str) or not value.strip():
        raise AppError(f"{key} is required", "invalid_cleaning_step", 400)
    return value.strip()


def require_string_list_config(step: CleaningStepRequest, key: str) -> list[str]:
    value = step.config.get(key)
    if not isinstance(value, list) or not value:
        raise AppError(f"{key} is required", "invalid_cleaning_step", 400)
    result = [item.strip() for item in value if isinstance(item, str) and item.strip()]
    if len(result) != len(value):
        raise AppError(f"{key} must contain field names", "invalid_cleaning_step", 400)
    return result


def apply_cleaning_steps(
    rows: list[dict[str, object | None]],
    steps: list[CleaningStepRequest],
) -> list[dict[str, object | None]]:
    cleaned_rows = [dict(row) for row in rows]

    for step in steps:
        if step.operation == "rename_field":
            source = require_string_config(step, "source_field")
            target = require_string_config(step, "target_field")
            cleaned_rows = [
                rename_row_field(row, source=source, target=target) for row in cleaned_rows
            ]
        elif step.operation == "fill_null":
            field = require_string_config(step, "field")
            value = step.config["value"]
            cleaned_rows = [
                {**row, field: value if row.get(field) in (None, "") else row.get(field)}
                for row in cleaned_rows
            ]
        elif step.operation == "drop_null_rows":
            fields = require_string_list_config(step, "fields")
            cleaned_rows = [
                row
                for row in cleaned_rows
                if all(row.get(field) not in (None, "") for field in fields)
            ]
        elif step.operation == "deduplicate":
            fields = require_string_list_config(step, "fields")
            cleaned_rows = deduplicate_rows(cleaned_rows, fields)

    return cleaned_rows


def rename_row_field(
    row: dict[str, object | None],
    *,
    source: str,
    target: str,
) -> dict[str, object | None]:
    renamed: dict[str, object | None] = {}
    for key, value in row.items():
        renamed[target if key == source else key] = value
    return renamed


def deduplicate_rows(
    rows: list[dict[str, object | None]],
    fields: list[str],
) -> list[dict[str, object | None]]:
    seen: set[tuple[Any, ...]] = set()
    result: list[dict[str, object | None]] = []
    for row in rows:
        key = tuple(row.get(field) for field in fields)
        if key in seen:
            continue
        seen.add(key)
        result.append(row)
    return result


def infer_preview_fields(*, dataset: Dataset, rows: list[dict[str, object | None]]) -> list[str]:
    if rows:
        return list(rows[0].keys())
    return ["_das_row_id", *[field.name for field in dataset.fields]]


cleaning_service = CleaningService()
