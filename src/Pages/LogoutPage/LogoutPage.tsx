import React from "react";
import "./LogoutPage.scss";
import {useNavigate} from "react-router-dom";
import Button from "../../components/Button/Button.tsx";

interface LogoutPageProps {

}

const LogoutPage = (props: LogoutPageProps) =>{
    const TAG = "[LogoutPage.tsx]";
    const navigate = useNavigate();


    return (
        <div className="logoutPage">
            <h1>You have been signed out successfully!</h1>
            <p>Use the navbar above to get back to the main content!</p>
            <div className="uhoh">
                <p>Accidentally signed out? That's okay, click the botton below to log back in!</p>
                <Button text={"Log In Now!"} onClick={ (e) => {
                    navigate("/spotify");
                }}/>
            </div>
        </div>
    );
}

export default LogoutPage;
