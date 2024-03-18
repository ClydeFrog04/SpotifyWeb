import React, {createRef, CSSProperties, SetStateAction, useEffect, useRef} from "react";
import "./Toast.css";

interface ToastProps {
    toastText: string;
    setShowToast: React.Dispatch<SetStateAction<boolean>>;
    showToast: boolean;
    startTimeout: boolean;
    href?: string;

}

const Toast = (props: ToastProps) =>{
    const TAG = "[Toast.tsx]";
    const toastTTLRef = useRef<NodeJS.Timer>();
    const toastTTL = 5_000;
    const toastRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

        setTimeout( () => {
            // toastRef.current = document.getElementById("toastMessage");
            toastRef.current?.classList.add("displayToast");
        }, 100);

        return  () => {
            clearInterval(toastTTLRef.current as NodeJS.Timer);
        }
    }, []);

    useEffect(() => {
        if(props.startTimeout === true){
            setTimeout( () => {
                toastRef.current?.classList.remove("displayToast");
                setTimeout( () => {
                    props.setShowToast(false);
                }, 1000);
            }, toastTTL);
        }
    }, [props.startTimeout]);

    return (
        <div ref={toastRef} className="toast" id={"toastMessage"}>
            <a href={props.href || ""} target={"_blank"}>
                {props.toastText}
            </a>
        </div>
    );
}

export default Toast;
