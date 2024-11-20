import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import * as constants from './utils/constants';
import { JSONSchemaFaker as jsonFaker}  from "json-schema-faker";
import { Routes } from "./route/routeLoader";
import * as files from './utils/files';

const app = express();
const PORT = process.env.PORT || 3000;

jsonFaker.extend("faker", () => require('@faker-js/faker'));
jsonFaker.option({ 
  fillProperties: false, ignoreMissingRefs: true, 
  failOnInvalidTypes: false, failOnInvalidFormat: false
});

app.use(express.json());

fs.readdirSync(constants.ROUTE_ROOT_DIR).forEach(dir => {
  const routes = new Routes(dir);
  routes.load();
  routes.expose(jsonFaker);  
  app.use("/", routes.mockRouter);
})


app.listen(PORT, () => {
  console.log(`Server is running http://localhost:${PORT}`);
});
