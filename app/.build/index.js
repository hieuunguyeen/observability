"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PORT = parseInt(process.env.PORT || "8080");
const app = (0, express_1.default)();
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
app.get("/roll", (req, res) => {
    res.send(getRandomNumber(1, 100).toString());
});
app.listen(PORT, () => {
    console.log(`Listening for requests on http://localhost:${PORT}`);
});
