import "./App.scss";
import {Route, Routes} from "react-router-dom";

function App() {
    console.log(import.meta.env.MODE);
    console.log(import.meta.env.VITE_REDIRECT_TARGET);

    return (
        <>
            <div className="App">
                <Routes>
                    <Route
                        path={"/"}
                        element={
                            <div>{import.meta.env.VITE_REDIRECT_TARGET}</div>
                        }
                    />
                </Routes>
            </div>
        </>
    );
}

export default App;
