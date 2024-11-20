import * as fs from "fs";
import * as path from "path";
import { Route } from "./route";
import * as constants from '../utils/constants';
import * as utils from "../utils/files";
import { Router, Request, Response } from 'express';
import * as yaml from 'js-yaml';
import { JSONSchemaFaker } from 'json-schema-faker';
import Ajv, {ValidateFunction} from "ajv";
import addFormat  from 'ajv-formats';
import { SchemaResolver } from "./resolver";

export class Routes {
    rootPath: string;
    routes: Route[] = [];
    ajvs: Record<string, Ajv> = {};
    mockRouter = Router();

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.load();
    }

    expose = (faker: typeof JSONSchemaFaker) => {
        this.routes.forEach(route => {
            const operation = route.operation;
            const endpoint = "/" + this.rootPath + route.getFullPath();
            switch (operation) {
                case "get" : {
                    this.mockRouter.get(endpoint, (req, res) =>  route.generateResponse(faker, req, res));
                    break;
                }
                case "post" : {                    
                    this.mockRouter.post(endpoint, (req, res) =>  {
                        const ajv = this.ajvs[this.rootPath + "/" + route.schema.info.title];
                        const isValid = route.validate(ajv, req, res);
                        if (!isValid) {
                            return;
                        }
                        route.generateResponse(faker, req, res);
                    });
                    break;
                }
                case "put" : {
                    this.mockRouter.put(endpoint, (req, res) =>  route.generateResponse(faker, req, res));
                    break;
                }
                case "delete" : {
                    this.mockRouter.delete(endpoint, (req, res) =>  route.generateResponse(faker, req, res));
                    break;
                }
            }
        })                
    }

    load = () => {
        const schemas = fs.readdirSync(constants.getSchemasDirectory(this.rootPath));
        schemas.forEach(schemaFilename => {
            const schemaFile = path.join(constants.getSchemasDirectory(this.rootPath), schemaFilename);
            const content = fs.readFileSync(schemaFile);
            const schema = schemaFilename.endsWith('.yaml') ? yaml.load(content.toString()) : JSON.parse(content.toString());
            const ajv: Ajv = new Ajv({ allErrors: true, strict: false, validateSchema: "log" });
            addFormat(ajv);
            const resolver = new SchemaResolver(schema);
            const definitions = resolver.getSchemaDefinitions();
            Object.entries(definitions).forEach(([key, value]) => {
                ajv.addSchema(definitions[key], resolver.getSchemaDefinitionExpression(key));
            });
            this.ajvs[this.rootPath + "/" + schema.info.title] = ajv;
            const paths = schema.paths;
            for (const path in paths) {
                if (paths.hasOwnProperty(path)) {
                    for (const operation in paths[path]) {
                        if (paths[path].hasOwnProperty(operation)) {
                            const operationDef = paths[path][operation];
                            for (const successResponse in operationDef.responses) {
                                if (operationDef.responses.hasOwnProperty(successResponse) && successResponse.startsWith("2")) {
                                    const route = new Route(this.rootPath, schema, schemaFile, path, operation, successResponse);
                                    this.routes.push(route);        
                                }
                            }
                            
                        }
                    }
                }

            }
        });
    }
}
