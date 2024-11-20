import { Request, Response, NextFunction } from 'express';
import Ajv, { ValidateFunction } from 'ajv';
import { Route } from './route';

enum schemaVersion {
    SWAGGER_V2,
    OPENAPI_V3
}

export class SchemaResolver {
    schema: any;
    schemaVersion: schemaVersion;

    constructor(schema: any) {
        this.schema = schema;
        this.schemaVersion = this.getSchemaVersion();
    }

    getBasePath = (): string => {
        let basePath = "";
        switch (this.schemaVersion) {
            case schemaVersion.SWAGGER_V2: {
                basePath = this.schema.basePath ? this.schema.basePath : "";
                break;
            }
            case schemaVersion.OPENAPI_V3: {
                if (this.schema.servers && this.schema.servers[0]) {
                    const url = new URL(this.schema.servers[0].url);
                    basePath = url.pathname;
                }
                break;
            }
        }
        return basePath;
    }

    getSchemaVersion = () : schemaVersion => {
        return this.schema.openapi ? schemaVersion.OPENAPI_V3 : schemaVersion.SWAGGER_V2;
    }

    getSchemaDefinitions = () :  { [key: string]: any } => {
        switch (this.schemaVersion) {
            case schemaVersion.SWAGGER_V2: {
                return this.schema.definitions;
            }
            case schemaVersion.OPENAPI_V3: {
                return this.schema.components.schemas;
            }
        }
    }

    getSchemaDefinition = (definitionName: string) : any => {
        switch (this.schemaVersion) {
            case schemaVersion.SWAGGER_V2: {
                return this.schema.definitions[definitionName];
            }
            case schemaVersion.OPENAPI_V3: {
                return this.schema.components.schemas[definitionName];
            }
        }
    }

    getSchemaDefinitionExpression = (definitionName: string) : string => {
        switch (this.schemaVersion) {
            case schemaVersion.SWAGGER_V2: {
                return `#/definitions/${definitionName}`;
            }
            case schemaVersion.OPENAPI_V3: {
                return `#/components/schemas/${definitionName}`;
            }
        }
    }

    getRequestBodySchema = (endpoint: string, operation: string) : any => {
        switch (this.schemaVersion) {
            case schemaVersion.SWAGGER_V2: {
                const operationParams: any[] = this.schema.paths[endpoint][operation].parameters;
                const schemaDef = operationParams.find(param => param.in == "body").schema;
                if (schemaDef["$ref"]) {
                    const schemaName: string = this.getDefinitionName(schemaDef["$ref"]);
                    return this.schema.definitions[schemaName];
                }
                return schemaDef;
            }
            case schemaVersion.OPENAPI_V3: {
                const schemaDef = this.schema.paths[endpoint][operation].requestBody.content["application/json"].schema;
                if (schemaDef["$ref"]) {
                    const schemaName: string = this.getDefinitionName(schemaDef["$ref"]);
                    return this.schema.components.schemas[schemaName];
                }
                return schemaDef;
            }
        }
    }

    getResponseSchema = (endpoint: string, operation: string, code: string) : any => {
        const responseCodeDef = this.schema.paths[endpoint][operation].responses[code];
        switch (this.schemaVersion) {
            case schemaVersion.SWAGGER_V2: {
                return responseCodeDef.schema
            }
            case schemaVersion.OPENAPI_V3: {
                return responseCodeDef.content ? responseCodeDef.content["application/json"].schema : null;
            }
        }
    }

    getDefinitionName = (schemaRef: string) : string => {
        const result = schemaRef.split("/").pop();
        return result ? result : "";
    }
}