import React, {useEffect, useState} from "react";
import "./DiscoverWeeklySaver.css";
import {Page, Playlist, PlaylistedTrack, SimplifiedPlaylist, SpotifyApi, UserProfile} from "@spotify/web-api-ts-sdk";

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

    const scopes = ["user-read-private", "user-read-email", "playlist-modify-public", "playlist-modify-private"];
    const sdk = SpotifyApi.withUserAuthorization(import.meta.env.VITE_SPOTIFY_CLIENT_ID, import.meta.env.VITE_REDIRECT_TARGET, scopes);
    // const sdk = SpotifyApi.withClientCredentials()
    // const sdk = useSpotify(import.meta.env.VITE_SPOTIFY_CLIENT_ID, import.meta.env.VITE_REDIRECT_TARGET, scopes);
    // if (sdk === null) {
    //     sdk = SpotifyApi.withUserAuthorization(import.meta.env.VITE_SPOTIFY_CLIENT_ID, import.meta.env.VITE_REDIRECT_TARGET, scopes);
    // }

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
        //37i9dQZF1EVKuMoAJjoTIw?si=ae9318c75dce445f idk what this pl is
        const id = await getDiscoverWeeklyPlaylistId();
        const items = await sdk.playlists.getPlaylistItems(id);
        return items.items;
        // return sdk.playlists.getPlaylist(id)
        //     .then((playlist) => {
        //         setPlaylistItems(playlist.tracks.items);
        //         return true;
        //     }).catch((err) => {
        //         console.error(err);
        //         return false;
        //     });
    }

    /**
     * gets the discover weekly playlist id for the current user
     */
    async function getDiscoverWeeklyPlaylistId() {
        //todo: verify that it is guaranteed that the first result will always be the users correct discover weekly
        const id = (await sdk.search("Discover Weekly", ["playlist"])).playlists?.items[0].id;
        console.log(TAG, "id found for discover weekly playlist:", id);
        return id;
    }

    /**
     * gets all on repeat items for the current user
     */
    async function getUsersOnRepeatItems() {
        // const id = (await sdk.search("On Repeat", ["playlist"])).playlists?.items[0].id;
        const searchResults = await sdk.search("On Repeat", ["playlist"]);
        let id = "";
        for (let i = 0; i < searchResults.playlists?.items.length; i++) {
            const playlist = searchResults.playlists?.items[i];
            if (playlist.owner.display_name === "Spotify" && playlist.name === "On Repeat") {
                id = playlist?.id;
                break;
            }
        }

        console.log(TAG, "on repeat id found:", id);
        const items = (await sdk.playlists.getPlaylistItems(id)).items;
        setOnRepeatItems(items);

        return id;
    }




    // sdk.currentUser

    useEffect(() => {
        // const items = await sdk.search("The Beatles", ["artist"]);

        // sdk.search("Discover Weekly", ["playlist"])
        //     .then((items) => {
        //         // console.table(items.artists.items.map((item) => ({
        //         //     name: item.name,
        //         //     followers: item.followers.total,
        //         //     popularity: item.popularity,
        //         // })));
        //         console.log(items.playlists?.items.map( (item) => {
        //             return item.description
        //         }))
        //     })
        //     .catch((error) => {
        //         console.error(error);
        //     });
        (async () => {
            const { authenticated } = await sdk.authenticate();
            console.log("internal auth:", authenticated);

            if(authenticated){
                console.log("yay");
                getDiscoverWeeklyPlaylistId().then((res) => {
                    setDwPlId(res);
                });
                getUsersOnRepeatItems().then((res) => {
                    console.log("on repeat", res);
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
            }else{
                console.log("not authed");
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
            console.log(TAG, name);
            if (item.name === name) {
                console.log(TAG, "the playlist already exists, leaving early so that we can add items!");
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
        /*
        (await sdk.playlists.getPlaylistItems(plId)).items.map((item) => {
                        return item.track.uri;
                    });
         */
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
                console.log(TAG, "items added successfully:", plId);
            }).catch(console.error);
    }

    /**
     * creates a playlist for the current user with the playlist details provided
     * @param playlistDetails
     */
    async function createPlaylist(playlistDetails: CreatePlaylistRequest) {
        //const newPlId = (await sdk.playlists.createPlaylist(user.id, playlistDetails)).id;
        return (await sdk.playlists.createPlaylist(user.id, playlistDetails)).id;

    }

    /**
     * saves users current on repeat songs to an on repeat collection for the current month
     */
    async function saveOnRepeat() {
        const today = new Date;
        const month = today.toLocaleString("default", {month: "short"});
        const plName = `OnRepeat${month}`;
        // const today = new Date;
        console.log(TAG, plName);
        const onRepeatPlId = await searchForPlaylistByName(plName);
        console.log(TAG, "saveOnRepeat:", onRepeatPlId);

        if (onRepeatPlId !== null) {
            await addSongsToExistingPlaylist(onRepeatPlId, onRepeatItems.map((item) => item.track.uri));
        } else {
            console.log(TAG, "on repeat did not exist, creating new playlist!", `Adding ${onRepeatItems.length} items.`);
            const playlistDetails = {
                "name": plName,
                "description": `Songs you love for ${today.toLocaleString("default", {
                    month: "long",
                    year: "numeric"
                })}`,
                "public": true
            };

            const newPlId = await createPlaylist(playlistDetails);
            const uris = onRepeatItems.map((e) => e.track.uri);
            console.log(TAG, `Creating new playlist ${plName} with ${uris.length} songs.`);
            await addSongsToPl(newPlId, uris);
        }
    }

    /**
     * this function will add the provided uris to the existing playlist given by the playlist id.
     * for any song that already exists in the given collection, they will be skipped.
     * @param plId playlist to add songs too
     * @param uris songs to add to playlist
     */
    async function addSongsToExistingPlaylist(plId: string, uris: string[]) {
        console.log(TAG, "addsongstoexistingplaylist");
        const providedPlSongs = await getPlaylistUris(plId);

        const songsNotAlreadyInPl = uris.filter((uri) => {
            return !providedPlSongs.includes(uri);
        });

        const name = (await sdk.playlists.getPlaylist(plId)).name;

        //if we found songs that are not already in the playlist, add them. this prevents duplicate songs and
        // prevents the user from being able to spam click the button and add then entire collection multiple times :]
        if (songsNotAlreadyInPl.length > 0) {
            await addSongsToPl(plId, songsNotAlreadyInPl);
            console.log(TAG, `Added ${songsNotAlreadyInPl.length} songs to ${name}`);
        } else {
            console.log(TAG, `No new songs founds to add to ${name}, songs already exist!`);
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
            console.log(TAG, "creating pl and adding items:", discoverWeeklyItems.length);
            const playlistDetails = {
                "name": dwCollectionPLName,
                "description": "Testing creating a discover weekly playlist from react using spotify sdk/web api",
                "public": true
            };

            const newPlId = await createPlaylist(playlistDetails);
            await addSongsToPl(newPlId, thisWeeksSongs);
        }
    }

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
        <div className="discoverWeeklySaver">
            {!loading &&
                <>
                    {errorOnPage ? <div className="error">Something went wrong!</div> :
                        <>
                            <h1>Welcome {user.display_name}!!</h1>
                            <img className="usrImg" src={imageUrl} alt=""/>
                            <button
                                onClick={activeTab === "discover_weekly" ? saveSongsToCollection : saveOnRepeat}>Save
                                these songs!
                            </button>
                            <div className="plNameEntry">
                                <span className={"showInput"} onClick={toggleShowInput}>Want to name your playlist yourself instead of using the default?</span>
                                {showInput &&
                                    <input className={"collectionNameInput"} type="text" value={dwCollectionPLName}
                                           onChange={(event) => {
                                               setDwCollectionPLName(event.target.value);//todo: use this for onrepeat too!
                                           }}/>
                                }
                            </div>
                            {/*<button onClick={searchForCollectionPlaylist}>search for collection!</button>*/}
                            {/*<button onClick={saveSongsToCollection}>save songs better</button>*/}
                            <div className="tabContainer">
                                <div className={`tab ${activeTab === "discover_weekly" && "active"}`.trimEnd()}
                                     onClick={() => {
                                         setActiveTab("discover_weekly");
                                     }}>Discover Weekly
                                </div>
                                <div className={`tab ${activeTab === "on_repeat" && "active"}`.trimEnd()}
                                     onClick={() => {
                                         setActiveTab("on_repeat");
                                     }}>On Repeat
                                </div>
                            </div>
                            <div className="playlist">
                                {/*{activeTab === "discover_weekly" ?*/}
                                {/*    <h2>Here's what's on your Discover Weekly this week!</h2> :*/}
                                {/*    <h2>Here's what's you're listening to most right now!</h2>*/}
                                {/*}*/}
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
