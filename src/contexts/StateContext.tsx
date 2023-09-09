/**
 * @author Randi Egan
 * @date   5/25/2023
 */


import React, {createContext, Dispatch, JSX, PropsWithChildren, SetStateAction, useState} from "react";

//define our default state
const defaultState = {
    name: "",
    setName: () => {}
};

interface IState {
    name: string;
    setName: Dispatch<SetStateAction<string>>;
}

//the actual context object
export const StateContext = createContext<IState>(defaultState);

//and finally the provider for the context
export const StateContextProvider: React.FC<JSX.Element> = (props: PropsWithChildren<React.ReactNode>) =>{
    const [name, setName] = useState(defaultState.name);





    return (
        <StateContext.Provider
            value={{
                name,
                setName

            }}>
            {props.children}
        </StateContext.Provider>
    );
}
