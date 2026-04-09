from fastapi import HTTPException
from jsonschema import Draft7Validator, ValidationError, SchemaError


def validate_json_schema(schema: dict, label: str = "schema") -> None:
    """Verify that a dict is a valid JSON Schema (Draft 7+). Raises HTTPException on failure."""
    try:
        Draft7Validator.check_schema(schema)
    except SchemaError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid JSON Schema in {label}: {exc.message}",
        )


def validate_data_against_schema(data: dict, schema: dict, label: str = "input") -> None:
    """Validate a data payload against a JSON Schema. Raises HTTPException with all errors."""
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    if errors:
        messages = []
        for err in errors:
            path = ".".join(str(p) for p in err.absolute_path) or "(root)"
            messages.append(f"{path}: {err.message}")
        raise HTTPException(
            status_code=422,
            detail=f"Validation failed for {label}: {'; '.join(messages)}",
        )
