/**
 * date 11-09-2022
 * author Randi Egan
 *
 * brief This component will combine all context providers into one provider so that we only need to wrap our app in one
 * provider which gets rid of the need for endless context provider nesting while still allowing us to access individual
 * providers, making it clear in our code which contexts data is coming from :] similar to redux combine reducers but better!
 *
 * reference https://medium.com/front-end-weekly/how-to-combine-context-providers-for-cleaner-react-code-9ed24f20225e
 * but modified to be compatible with React 18 woot!
 */
import React, {JSX, PropsWithChildren} from "react";
import {StateContextProvider} from "./StateContext";


const combineContexts =  (...contexts: React.FC<JSX.Element>[]) => {
    return contexts.reduce(
        (AccumulatedContexts, CurrentContext:React.FC<any>) => {
            return  ({children}: PropsWithChildren<React.FC>): JSX.Element => {
                return (
                    <AccumulatedContexts>
                        <CurrentContext>{children}</CurrentContext>
                    </AccumulatedContexts>
                );
            };
        },
        ({children}: PropsWithChildren<any>) => <>{children}</>
    )
}

const providers = [
    StateContextProvider,
]

export const RootProvider = combineContexts(...providers);