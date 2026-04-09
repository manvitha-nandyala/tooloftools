import pytest
from fastapi import HTTPException

from src.app.services.schema_validator import validate_data_against_schema, validate_json_schema


class TestValidateJsonSchema:
    def test_valid_schema(self):
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        validate_json_schema(schema)

    def test_invalid_schema_raises(self):
        schema = {"type": "not-a-real-type"}
        with pytest.raises(HTTPException) as exc:
            validate_json_schema(schema)
        assert exc.value.status_code == 422


class TestValidateDataAgainstSchema:
    def test_valid_data(self):
        schema = {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        }
        validate_data_against_schema({"name": "test"}, schema)

    def test_missing_required_field(self):
        schema = {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        }
        with pytest.raises(HTTPException) as exc:
            validate_data_against_schema({}, schema)
        assert exc.value.status_code == 422
        assert "name" in str(exc.value.detail)

    def test_wrong_type(self):
        schema = {"type": "object", "properties": {"count": {"type": "integer"}}}
        with pytest.raises(HTTPException):
            validate_data_against_schema({"count": "not-a-number"}, schema)
