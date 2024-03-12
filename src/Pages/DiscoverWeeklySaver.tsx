import React, {useEffect, useRef, useState} from "react";
import "./DiscoverWeeklySaver.css";
import {Page, PlaylistedTrack, SimplifiedPlaylist, SpotifyApi, UserProfile} from "@spotify/web-api-ts-sdk";
import SpotifyLogoGreen from "../res/spotify-icons-logos/logos/01_RGB/02_PNG/Spotify_Logo_RGB_Green.png";
import Toast from "../components/Toast/Toast.tsx";
import {useNavigate} from "react-router-dom";

interface DiscoverWeeklySaverProps {

}

interface CreatePlaylistRequest {
    name: string;
    public?: boolean;
    collaborative?: boolean;
    description?: string;
}

const DiscoverWeeklySaver = (props: DiscoverWeeklySaverProps) => {
    const TAG = "[DiscoverWeeklySaver.tsx]";
    const verboseLogging = import.meta.env.VITE_VERBOSE_LOGGING === true;
    console.log("VERBOSE LOGGING SET TO", verboseLogging);

    const scopes = ["user-read-private", "user-read-email", "playlist-modify-public", "playlist-modify-private"];
    const sdk = SpotifyApi.withUserAuthorization(import.meta.env.VITE_SPOTIFY_CLIENT_ID, import.meta.env.VITE_REDIRECT_TARGET, scopes);
    // const sdk = SpotifyApi.withClientCredentials()
    // const sdk = useSpotify(import.meta.env.VITE_SPOTIFY_CLIENT_ID, import.meta.env.VITE_REDIRECT_TARGET, scopes);
    // if (sdk === null) {
    //     sdk = SpotifyApi.withUserAuthorization(import.meta.env.VITE_SPOTIFY_CLIENT_ID, import.meta.env.VITE_REDIRECT_TARGET, scopes);
    // }

    //state vars
    const [imageUrl, setImageUrl] = useState("");
    const [discoverWeeklyItems, setDiscoverWeeklyItems] = useState<PlaylistedTrack[]>([]);
    const [onRepeatItems, setOnRepeatItems] = useState<PlaylistedTrack[]>([]);
    const [user, setUser] = useState<UserProfile>({} as UserProfile);
    const [dwCollectionPLName, setDwCollectionPLName] = useState("Discover Weekly Collection");
    const [loading, setLoading] = useState(true);
    const [errorOnPage, setErrorOnPage] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [dwPlId, setDwPlId] = useState("");
    const [activeTab, setActiveTab] = useState<"discover_weekly" | "on_repeat">("discover_weekly");
    const [showToast, setShowToast] = useState(false);
    const [toastText, setToastText] = useState("this is a toast:]");
    const timeToCompareAgainst = useRef(0);


    //constants
    const today = new Date;
    const month = today.toLocaleString("default", {month: "short"});
    const year = today.toLocaleString("default", {year: "numeric"});
    const onRepeatCollectionPLName = `OnRepeat${month}${year}`;
    const navigate = useNavigate();
    const oneDayInMS = 86_400_000;

    const writeLog = (...logTextRest: any[]) => {
        if (verboseLogging) {
            let out = "";
            logTextRest.forEach((logText) => {
                out += " " + logText;
            });
            console.log(TAG, out);
        }
    };

    const logout = () => {
        writeLog("Logging out!");
        localStorage.removeItem("spotify-sdk:AuthorizationCodeWithPKCEStrategy:token");
        localStorage.removeItem("spotify-sdk:verifier");
        localStorage.removeItem("TTL");
        navigate("/");
    };

    /**
     * @returns boolean whether user profile was retrieved successfully
     */
    async function getCurrentUserProfile(): Promise<boolean> {
        return sdk.currentUser.profile()
            .then((profile) => {
                setImageUrl(profile.images[0].url);
                setUser(profile);
                return true;
            }).catch((err) => {
                console.error(err);
                return false;
            });
    }

    /**
     * @returns boolean whether dw items were retrieved successfully
     */
    async function getDiscoverWeeklyItems() {//todo: refactor to return bool instead of promise
        const id = await getDiscoverWeeklyPlaylistId();
        const items = await sdk.playlists.getPlaylistItems(id);
        return items.items;
    }

    /**
     * gets the discover weekly playlist id for the current user
     */
    async function getDiscoverWeeklyPlaylistId() {
        //todo: verify that it is guaranteed that the first result will always be the users correct discover weekly
        const id = (await sdk.search("Discover Weekly", ["playlist"])).playlists?.items[0].id;
        writeLog("id found for discover weekly playlist:", id);
        return id;
    }

    /**
     * gets all on repeat items for the current user
     */
    async function getUsersOnRepeatItems() {
        const searchResults = await sdk.search("On Repeat", ["playlist"]);
        let id = "";
        for (let i = 0; i < searchResults.playlists?.items.length; i++) {
            const playlist = searchResults.playlists?.items[i];
            if (playlist.owner.display_name === "Spotify" && playlist.name === "On Repeat") {//todo: probably should do this for the discover weekly plid too
                id = playlist?.id;
                break;
            }
        }

        writeLog("on repeat id found:", id);
        const items = (await sdk.playlists.getPlaylistItems(id)).items;
        setOnRepeatItems(items);

        return id;
    }

    const validateTTL = () => {
        writeLog("checking ttl");
        // const TTL:number = parseInt(localStorage.getItem("TTL"));
        const lsTTL = localStorage.getItem("TTL");
        const TTL = lsTTL !== null ? parseInt(lsTTL) : undefined;
        writeLog("TTL found: ", TTL);
        if (TTL !== undefined && TTL <= timeToCompareAgainst.current) {
            logout();
        } else {
            localStorage.setItem("TTL", (timeToCompareAgainst.current + oneDayInMS).toString());
        }
    };

    const extendTTL = () => {
        localStorage.setItem("TTL", (Date.now() + oneDayInMS).toString());
    };

    useEffect(() => {
        timeToCompareAgainst.current = Date.now();
        writeLog("about to call ttl");
        validateTTL();
        writeLog("post call ttl");

        (async () => {
            const {authenticated} = await sdk.authenticate();
            writeLog("internal auth:", authenticated);

            if (authenticated) {
                getDiscoverWeeklyPlaylistId().then((res) => {
                    setDwPlId(res);
                });
                getUsersOnRepeatItems().then((res) => {
                    writeLog("on repeat", res);
                });

                if (import.meta.env.MODE === "development") {
                    setDwCollectionPLName("Discover Weekly Collection_DEV");

                }
                getCurrentUserProfile().then(() => {
                    getDiscoverWeeklyItems().then((res) => {
                        setLoading(false);
                        if (res) {
                            setDiscoverWeeklyItems(res);
                        } else {
                            setErrorOnPage(true);
                        }
                    });
                }).catch(console.error);//todo: might need a loading screen got the getdwitems, we will have to wait for that to finish
            } else {
                writeLog("not authed");
            }
        })();
    }, []);

    function toggleShowInput() {
        setShowInput(!showInput);
    }

    /**
     * returns an array of uris for this week's Discover Weekly tracks
     */
    function getThisWeeksDWSongs() {
        return discoverWeeklyItems.map((item) => {
            return item.track.uri;
        });
    }

    /**
     * searches users playlists for a playlist matching the collectionPLName- returns null(do we want undefined instead?) if not found, returns playlistId if found
     * @param name string name of playlist you want to retrieve the playlist id for
     */
    async function searchForPlaylistByName(name: string) {
        let plId: string | null = null;
        const MAX_SEARCH = 50;
        let offset = 0;//offset will be incremented in groups of 50 until we run out of playlists or find what we are looking for

        let tmpRes;
        while ((tmpRes = await sdk.currentUser.playlists.playlists(MAX_SEARCH, offset)).items.length > 0) {
            let plIdFound = searchListForPlaylistByName(tmpRes, name);
            if (plIdFound !== null) {
                plId = plIdFound;
                break;
            } else {
                offset += MAX_SEARCH;
            }
        }
        return plId;
    }

    /**
     * a helper function for checking if the dwCollection playlist is in the users playlists, returns the playlist id if so, null otherwise
     * @note this function should generally NOT be called directly, it is used by the searchForPlaylistByName function
     *       as a helper function and to keep code dry!
     * @param res a paged response typically provided by a search using the api
     * @param name the name of the playlist you want to look for
     */
    function searchListForPlaylistByName(res: Page<SimplifiedPlaylist>, name: string) {
        for (let i = 0; i < res.items.length; i++) {
            const item = res.items[i];
            writeLog(name);
            if (item.name === name) {
                writeLog("the playlist already exists, leaving early so that we can add items!");
                return item.id;
            }
        }
        return null;
    }

    /**
     * returns an array of uris for the given playlist id
     * @param plId
     */
    async function getPlaylistUris(plId: string) {
        return (await sdk.playlists.getPlaylistItems(plId)).items.map((item) => {
            return item.track.uri;
        });
    }

    /**
     * adds list of songs to a given playlist
     * @param plId the playlist id for the playlist you want to add to
     * @param urisToAdd an array of song uris you want to add to the given playlist
     */
    //todo: this function might be deprecated by the add to existing, see if we can scrap this one!
    async function addSongsToPl(plId: string, urisToAdd: string[]) {
        sdk.playlists.addItemsToPlaylist(plId, urisToAdd)
            .then((res) => {
                writeLog("items added successfully:", plId);
            }).catch(console.error);
    }

    /**
     * creates a playlist for the current user with the playlist details provided
     * @param playlistDetails
     * @returns the playlist id of the newly created playlist :]
     */
    async function createPlaylist(playlistDetails: CreatePlaylistRequest) {
        return (await sdk.playlists.createPlaylist(user.id, playlistDetails)).id;
    }

    /**
     * saves users current on repeat songs to an on repeat collection for the current month
     */
    async function saveOnRepeat() {
        writeLog(onRepeatCollectionPLName);
        const onRepeatPlId = await searchForPlaylistByName(onRepeatCollectionPLName);
        writeLog("saveOnRepeat:", onRepeatPlId);

        if (onRepeatPlId !== null) {
            await addSongsToExistingPlaylist(onRepeatPlId, onRepeatItems.map((item) => item.track.uri));
        } else {
            const outText = `on repeat did not exist, creating new playlist! Adding ${onRepeatItems.length} items.`;
            writeLog(outText);
            makeToast(outText);
            const playlistDetails = {
                "name": onRepeatCollectionPLName,
                "description": `Songs you love for ${today.toLocaleString("default", {
                    month: "long",
                    year: "numeric"
                })}`,
                "public": true
            };

            const newPlId = await createPlaylist(playlistDetails);
            const uris = onRepeatItems.map((e) => e.track.uri);
            writeLog(`Creating new playlist ${onRepeatCollectionPLName} with ${uris.length} songs.`);
            await addSongsToPl(newPlId, uris);
        }
    }

    /**
     * gets all the songs for the week and adds them to an existing or new playlist. The name of the playlist is currently
     * hard coded, but i plan to add a textfield to allow the user to create or use their own playlist name!
     */
    async function saveSongsToCollection() {
        const collectionPlaylistId = await searchForPlaylistByName(dwCollectionPLName);
        const thisWeeksSongs = getThisWeeksDWSongs();

        if (collectionPlaylistId !== null) {
            await addSongsToExistingPlaylist(collectionPlaylistId, thisWeeksSongs);

        } else {
            const outText = `creating pl and adding items: ${discoverWeeklyItems.length}`;
            writeLog(outText);
            makeToast(outText);
            const playlistDetails = {
                "name": dwCollectionPLName,
                "description": "Testing creating a discover weekly playlist from react using spotify sdk/web api",
                "public": true
            };

            const newPlId = await createPlaylist(playlistDetails);
            await addSongsToPl(newPlId, thisWeeksSongs);
        }
    }

    /**
     * this function will add the provided uris to the existing playlist given by the playlist id.
     * for any song that already exists in the given collection, they will be skipped.
     * @param plId playlist to add songs too
     * @param uris songs to add to playlist
     */
    async function addSongsToExistingPlaylist(plId: string, uris: string[]) {
        const providedPlSongs = await getPlaylistUris(plId);

        const songsNotAlreadyInPl = uris.filter((uri) => {
            return !providedPlSongs.includes(uri);
        });

        const name = (await sdk.playlists.getPlaylist(plId)).name;

        //if we found songs that are not already in the playlist, add them. this prevents duplicate songs and
        // prevents the user from being able to spam click the button and add then entire collection multiple times :]
        let outText = "";
        if (songsNotAlreadyInPl.length > 0) {
            await addSongsToPl(plId, songsNotAlreadyInPl);
            outText = `Added ${songsNotAlreadyInPl.length} songs to ${name}`;
        } else {
            outText = `No new songs founds to add to ${name}, songs already exist!`;
        }
        writeLog(outText);
        makeToast(outText);
    }

    const makeToast = (toastText: string) => {
        setToastText(toastText);
        setShowToast(true);
    };

    //todo: currently not using these but do we want to???
    const discoverWeeklyContent = (
        <>
            <div className="playlist">
                <h2>Here's what's on your Discover Weekly this week!</h2>
                <div className="tracks">
                    {
                        discoverWeeklyItems.map((item) => {
                            const name = item.track.name;
                            const id = item.track.id;

                            //todo: make secondary request for when item is an episode to get the creators name.
                            const artist = "artists" in item.track ? item.track.artists[0].name : "Get Creator";
                            return (
                                <div className={"track"} key={id}>
                                    <div className="name">{name}</div>
                                    <span>-</span>
                                    <div className="artist">{artist}</div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </>
    );
    const onRepeatContent = (
        <>
            <div className="playlist">
                <h2>Here's what you're listening to most right now!</h2>
                <div className="tracks">
                    {
                        onRepeatItems.map((item) => {
                            const name = item.track.name;
                            const id = item.track.id;

                            //todo: make secondary request for when item is an episode to get the creators name.
                            const artist = "artists" in item.track ? item.track.artists[0].name : "Get Creator";
                            return (
                                <div className={"track"} key={id}>
                                    <div className="name">{name}</div>
                                    <span>-</span>
                                    <div className="artist">{artist}</div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </>
    );

    return (
        <div className="discoverWeeklySaver" onClick={ () => {
            writeLog("CLOCKED", Date.now());
            extendTTL();
        }}>
            {!loading &&
                <>
                    {errorOnPage ? <div className="error">Something went wrong!</div> :
                        <>
                            <img id="spotifyLogo" src={SpotifyLogoGreen} alt={"Spotify Logo"}/>
                            <div className="smolContainer">
                                <h1>Welcome {user.display_name}!!</h1>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    logout();
                                }}>Logout</button>
                            </div>

                            <img className="usrImg" src={imageUrl} alt=""/>
                            <button
                                onClick={activeTab === "discover_weekly" ? saveSongsToCollection : saveOnRepeat}>
                                Save these songs!
                            </button>
                            {showToast && <Toast toastText={toastText} setShowToast={setShowToast} showToast/>}
                            <div className="plNameEntry">
                                {activeTab === "discover_weekly" ?

                                    <>
                                        <span className={"showInput"} onClick={toggleShowInput}>Want to name your playlist yourself instead of using the default?</span>
                                        {showInput &&
                                            <input className={"collectionNameInput"} type="text"
                                                   value={dwCollectionPLName}
                                                   onChange={(event) => {
                                                       setDwCollectionPLName(event.target.value);//todo: use this for onrepeat too!
                                                   }}/>
                                        }
                                    </> :
                                    <>
                                        <p>On repeat collection playlist names are generated using the current month!
                                            Each month you will get a new on-repeat collection. You can find this
                                            month's collection by looking for "{onRepeatCollectionPLName}" in your
                                            playlists!</p>
                                    </>
                                }

                            </div>
                            <div className="spotifyLogoContainer">
                                {/*todo: add spotify logos!*/}
                                <img className="mobileLogo"/>
                            </div>
                            <div className="tabContainer">
                                <div className={`tab ${activeTab === "discover_weekly" ? "active" : ""}`.trimEnd()}
                                     onClick={() => {
                                         setActiveTab("discover_weekly");
                                     }}>Discover Weekly
                                </div>
                                <div className={`tab ${activeTab === "on_repeat" ? "active" : ""}`.trimEnd()}
                                     onClick={() => {
                                         setActiveTab("on_repeat");
                                     }}>On Repeat
                                </div>
                            </div>
                            <div className="playlist">
                                <div className="tracks">
                                    {
                                        (activeTab === "discover_weekly" ? discoverWeeklyItems : onRepeatItems).map((item) => {
                                            const name = item.track.name;
                                            const id = item.track.id;

                                            //todo: make secondary request for when item is an episode to get the creators name.
                                            const artist = "artists" in item.track ? item.track.artists[0].name : "Get Creator";
                                            return (
                                                <div className={"track"} key={id}>
                                                    <div className="name">{name}</div>
                                                    <span>-</span>
                                                    <div className="artist">{artist}</div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        </>}
                </>
            }
        </div>
    );
};

export default DiscoverWeeklySaver;
