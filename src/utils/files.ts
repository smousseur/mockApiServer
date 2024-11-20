import * as fs from "fs";
import * as path from "path";

export const isDirectory = (file: fs.PathLike) => {
    const stats = fs.lstatSync(file);
    return stats.isDirectory();    
}

export const isFile = (file: fs.PathLike) => {
    const stats = fs.lstatSync(file);
    return stats.isFile();
}

export const ROOT_DIR = path.resolve(__dirname, "..");

export const ROOT_PATH = path.join(__dirname, "..");
