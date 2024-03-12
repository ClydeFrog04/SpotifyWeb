import React, {CSSProperties, SetStateAction, useEffect, useRef} from "react";
import "./Toast.css";

interface ToastProps {
    toastText: string;
    setShowToast: React.Dispatch<SetStateAction<boolean>>;
    showToast: boolean;

}

const Toast = (props: ToastProps) =>{
    const TAG = "[Toast.tsx]";
    const toastTTLRef = useRef<NodeJS.Timer>();
    const toastTTL = 5_000;
    const toastRef = useRef<HTMLElement | null>();
    // const displayStyle: CSSProperties = {opacity: 1, bottom: "1rem"};

    useEffect(() => {

        setTimeout( () => {
            toastRef.current = document.getElementById("toastMessage");
            toastRef.current?.classList.add("displayToast");

        }, 100);

        setTimeout( () => {
            toastRef.current?.classList.remove("displayToast");
            setTimeout( () => {
                props.setShowToast(false);
            }, 1000);
        }, toastTTL);

        return  () => {
            clearInterval(toastTTLRef.current as NodeJS.Timer);
        }
    }, []);

    return (
        <div className="toast" id={"toastMessage"}>
            {props.toastText}
        </div>
    );
}

export default Toast;
