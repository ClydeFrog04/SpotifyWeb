import "./App.scss";
import {Route, Routes} from "react-router-dom";
import DiscoverWeeklySaver from "./Pages/DiscoverWeeklySaver.tsx";

function App() {
    const TAG = "[APP.tsx]";


    return (
        <>
            <div className="App">
                <Routes>
                    <Route
                        path={"/"}
                        element={<DiscoverWeeklySaver/>}
                    />
                </Routes>
            </div>
        </>
    );
}

export default App;
