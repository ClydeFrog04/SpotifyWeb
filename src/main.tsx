/**
 * @author Randi Egan
 */
import React from "react";
import * as ReactDOMClient from "react-dom/client";
import App from "./App.tsx";
import "./index.scss";
import {RootProvider} from "./contexts/RootProvider.tsx";
import {BrowserRouter as Router} from "react-router-dom";

const container = document.getElementById("root") as HTMLElement;
const root = ReactDOMClient.createRoot(container);

root.render(
    <Router>
        <RootProvider>
            <App/>
        </RootProvider>
    </Router>
);