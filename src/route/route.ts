import * as fs from "fs";
import * as path from "path";
import * as constants from '../utils/constants';
import { JSONSchemaFaker }  from "json-schema-faker";
import { NextFunction, Request, Response } from "express";
import { SchemaResolver } from './resolver';
import { SchemaEnv } from "ajv/dist/compile";
import addFormat  from 'ajv-formats';
import Ajv, {ValidateFunction} from "ajv"

export class Schema {
    [key: string]: any;
}

interface DefaultResponse {
    code: number;
    response: any;
}

export class Route {
    operation: string;
    code: string;
    endpoint: string;
    schemaFile: string;
    schema: any;
    rootPath: string;

    constructor(rootPath: string, schema: any, schemaFile: string, endpoint: string, operation: string, code: string) {
        this.schema = schema;
        this.rootPath = rootPath;
        this.schemaFile = schemaFile;
        this.endpoint = endpoint;
        this.operation = operation;
        this.code = code;
    }

    validate = (ajv: Ajv, request: Request, response: Response) => {
/*        
        const arr: any[] = this.schema.paths[this.endpoint][this.operation]["parameters"];
        const schemaDef: string = this.getDefinitionSchema(arr.find(param => param.in == "body").schema["$ref"]);        
        const validate = ajv.compile(this.schema.definitions[schemaDef]);
*/        
        const resolver = new SchemaResolver(this.schema);
        const requestSchema = resolver.getRequestBodySchema(this.endpoint, this.operation);
        const validate = ajv.compile(requestSchema);
        if (!validate(request.body)) {
            response.status(400).json({ errors: validate.errors });
            return false;
        }
        return true;
    }

    getDefinitionSchema = (schemaRef: string) : string => {
        const result = schemaRef.split("/").pop();
        return result ? result : "";
    }

    getFullPath = (): string => {
        const resolver = new SchemaResolver(this.schema);
        return resolver.getBasePath() + this.replacePathVariables(this.endpoint);
    }

    addMetadatas = () : Schema => {
        return new Schema();
    }

    replacePathVariables = (endpoint: string) => {
        return endpoint.replace(/\{(\w+)\}/g, ':$1');
    }

    generateResponse = (faker: typeof JSONSchemaFaker, request: Request, response: Response) : void => {
        const defaultPath = path.join(constants.getRouteDirectory(this.rootPath, constants.DEFAULT_DIRECTORY), 
            this.operation + "-" + this.getDefaultFilename(this.endpoint));
        if (fs.existsSync(defaultPath)) {
            fs.readFile(defaultPath, (err, content) => {
                if (err) {
                    response.status(500).send("Cannot read default file");
                }
                const responseDef: DefaultResponse  = JSON.parse(content.toString());
                response.status(responseDef.code).send(responseDef.response);    
            });
        } else {
            this.generateFakeResponse(faker, request, response);
        }

    }

    generateFakeResponse = (faker: typeof JSONSchemaFaker, request: Request, response: Response) : void => {
        const metadatasPath = path.join(constants.getRouteDirectory(this.rootPath, constants.METADATAS_DIRECTORY), "metadata-" + this.getRouteIdentifier() + ".json");
        fs.readFile(metadatasPath, (err, content) => {
            if (err) {
                if (err.code === "ENOENT") {
                    response.status(+this.code).send(this.getFakeValue(faker, this.schema));
                } else {
                    response.status(500).send("Cannot read metadatas file");                        
                }
                return;
            }
            const metadatas = JSON.parse(content.toString());
            this.loadMetadatas(this.schema, metadatas);
            response.status(+this.code).send(this.getFakeValue(faker, this.schema));
        })
    }

    loadMetadatas = (schema: any, metadatas: any) => {
        const resolver = new SchemaResolver(schema);
        for (const key in metadatas) {
            if (metadatas.hasOwnProperty(key)) {
                const metadataDef = metadatas[key];
                for (const keyDef in metadataDef) {
                    if (metadataDef.hasOwnProperty(keyDef)) {
                        const schemaDef = resolver.getSchemaDefinition(key);
                        schemaDef.properties[keyDef]["faker"] = metadataDef[keyDef];
                    }
                }
            }
        }
    }

    getFakeValue = (faker: typeof JSONSchemaFaker, schema: any) : any => {
        const fakeSchema = faker.generate(schema);
        const resolver = new SchemaResolver(fakeSchema);
        let fakeValue = resolver.getResponseSchema(this.endpoint, this.operation, this.code);
        if (this.isEmpty(fakeValue)) {
            return this.getFakeValue(faker, schema);
        }
        return fakeValue;
    }

    getDefaultFilename = (path: string, extension = 'json') : string => {
        return path
        .replace(/\//g, '_')
        .replace(/{(\w+)}/g, 'by_$1')
        .replace(/^_/, '')
        .toLowerCase()
        + `.${extension}`;  
    }

    getRouteIdentifier = () : string => {
        const match = this.schemaFile.match(/-(\w+)\.(\w+)$/);
        if (match) {
            return match[1];
        }
        return this.schemaFile;
    }
    
    isEmpty = (value: any) : boolean => {
        if (Array.isArray(value)) {
          return value.length === 0;
        } else if (typeof value === 'object' && value !== null) {
          return Object.keys(value).length === 0;
        }
        return true;
    }     
}