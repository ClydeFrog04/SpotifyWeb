import React, {useEffect, useState} from "react";
import "./DiscoverWeeklySaver.css";
import {Page, PlaylistedTrack, SimplifiedPlaylist, SpotifyApi, UserProfile} from "@spotify/web-api-ts-sdk";

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
    const [imageUrl, setImageUrl] = useState("");
    const [playlistItems, setPlaylistItems] = useState<PlaylistedTrack[]>([]);
    const [user, setUser] = useState<UserProfile>({} as UserProfile);
    const [dwCollectionPLName, setDwCollectionPLName] = useState("Discover Weekly Collection");
    const [loading, setLoading] = useState(true);
    const [errorOnPage, setErrorOnPage] = useState(false);


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
    async function getDiscoverWeeklyItems(): Promise<boolean> {//todo: refactor to return bool instead of promise
        //37i9dQZF1EVKuMoAJjoTIw?si=ae9318c75dce445f idk what this pl is
        return sdk.playlists.getPlaylist("37i9dQZEVXcUNWRvFBILtY")
            .then((playlist) => {
                setPlaylistItems(playlist.tracks.items);
                return true;
            }).catch((err) => {
                console.error(err);
                return false;
            });
    }


    // sdk.currentUser

    useEffect(() => {
        // const items = await sdk.search("The Beatles", ["artist"]);

        // sdk.search("The Beatles", ["artist"])
        //     .then((items) => {
        //         console.table(items.artists.items.map((item) => ({
        //             name: item.name,
        //             followers: item.followers.total,
        //             popularity: item.popularity,
        //         })));
        //     })
        //     .catch((error) => {
        //         console.error(error);
        //     });

        if (import.meta.env.MODE === "development") {
            setDwCollectionPLName((oldName) => {
                return oldName + "_DEV";
            });

        }
        getCurrentUserProfile().then(() => {
            getDiscoverWeeklyItems().then(() => {
                setLoading(false);
            });
        }).catch(console.error);//todo: might need a loading screen got the getdwitems, we will have to wait for that to finish

    }, []);

    /**
     * returns an array of uris for this week's Discover Weekly tracks
     */
    function getThisWeeksDWSongs() {
        return playlistItems.map((item) => {
            return item.track.uri;
        });
    }

    /**
     * searches users playlists for a playlist matching the collectionPLName- returns null(do we want undefined instead?) if not found, returns playlistId if found
     */
    async function searchForCollectionPlaylist() {
        let plId: string | null = null;
        const MAX_SEARCH = 50;
        let offset = 0;//offset will be incremented in groups of 50 until we run out of playlists or find what we are looking for

        let tmpRes;
        while ((tmpRes = await sdk.currentUser.playlists.playlists(MAX_SEARCH, offset)).items.length > 0) {
            let plIdFound = doesCollectionExistInList(tmpRes);
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
     * @param res
     */
    function doesCollectionExistInList(res: Page<SimplifiedPlaylist>) {//todo: better name needed- "does" implies boolean return
        for (let i = 0; i < res.items.length; i++) {
            const item = res.items[i];
            console.log(TAG, dwCollectionPLName);
            if (item.name === dwCollectionPLName) {
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

    async function addSongsToPl(plId: string, urisToAdd: string[]) {
        sdk.playlists.addItemsToPlaylist(plId, urisToAdd)
            .then((res) => {
                console.log(TAG, "items added successfully:", plId);
            }).catch(console.error);
    }

    async function createUserPlaylist(playlistDetails: CreatePlaylistRequest) {
        //const newPlId = (await sdk.playlists.createPlaylist(user.id, playlistDetails)).id;
        return (await sdk.playlists.createPlaylist(user.id, playlistDetails)).id;

    }

    /**
     * gets all the songs for the week and adds them to an existing or new playlist. The name of the playlist is currently
     * hard coded, but i plan to add a textfield to allow the user to create or use their own playlist name!
     */
    async function saveSongsToCollection() {
        const collectionPlaylistId = await searchForCollectionPlaylist();
        const thisWeeksSongs = getThisWeeksDWSongs();

        if (collectionPlaylistId !== null) {
            const dwCollectionSongs = await getPlaylistUris(collectionPlaylistId);

            //todo: potentially extract to function?
            const songsNotAlreadyInCollectionPL = thisWeeksSongs.filter((uri) => {
                return !dwCollectionSongs.includes(uri);
            });

            //if we found songs that are not already in the playlist, add them. this prevents duplicate songs and
            // prevents the user from being able to spam click the button and add then entire collection multiple times :]
            if (songsNotAlreadyInCollectionPL.length > 0) {
                await addSongsToPl(collectionPlaylistId, songsNotAlreadyInCollectionPL);
            }
        } else {
            console.log(TAG, "creating pl and adding items:", playlistItems.length);
            const playlistDetails = {
                "name": dwCollectionPLName,
                "description": "Testing creating a discover weekly playlist from react using spotify sdk/web api",
                "public": true
            };

            const newPlId = await createUserPlaylist(playlistDetails);
            await addSongsToPl(newPlId, thisWeeksSongs);
        }
    }

    function createPlaylist() {
        //
        console.log(TAG, user.id);
        /*
        var curr = new Date; // get current date
var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
var last = first + 6; // last day is the first day + 6

var firstday = new Date(curr.setDate(first)).toUTCString();
var lastday = new Date(curr.setDate(last)).toUTCString();
         */
        const today = new Date;
        const first = today.getDate() - today.getDay();
        const last = first + 6;
        const firstday = new Date(today.setDate(first)).toUTCString();
        const lastday = new Date(today.setDate(last)).toUTCString();
        console.log("this week", firstday, lastday);
        const playlistDetails = {
            "name": dwCollectionPLName,
            "description": "Testing creating a discover weekly playlist from react using spotify sdk/web api",
            "public": true
        };
        let plId: string | null = null;


        //todo: need to repeat this for every 50 result offset until no more results so we can be sure we've checked every pl the user has
        // also make this it's own function-
        sdk.currentUser.playlists.playlists(50)
            .then(async (res) => {
                console.log(TAG, "number of search results:", res.items.length);

                for (let i = 0; i < res.items.length; i++) {
                    const item = res.items[i];
                    if (item.name === dwCollectionPLName) {
                        console.log(TAG, "the playlist already exists, leaving early so that we can add items!");
                        plId = item.id;
                        break;
                    }
                }

                console.log(TAG, "Playlist id:", plId);
                if (plId !== null) {
                    //add items
                    console.log(TAG, "pl exists, adding items:", playlistItems.length);
                    const uris = getThisWeeksDWSongs();

                    const dwCollection = (await sdk.playlists.getPlaylistItems(plId)).items.map((item) => {
                        return item.track.uri;
                    });

                    console.log(TAG, "dw collection length:", dwCollection.length);
                    const songsNotAlreadyInAllTimePL = uris.filter((uri) => {
                        return !dwCollection.includes(uri);
                    });

                    // const savedSet = songsInSavedPl.m

                    if (songsNotAlreadyInAllTimePL.length > 0) {
                        sdk.playlists.addItemsToPlaylist(plId, songsNotAlreadyInAllTimePL)
                            .then((res) => {
                                console.log(TAG, "items added successfully- not created");
                            }).catch(console.error);
                    }

                } else {
                    console.log(TAG, "creating pl and adding items:", playlistItems.length);

                    sdk.playlists.createPlaylist(user.id, playlistDetails)
                        .then((res) => {
                            console.log(TAG, "playlist created!", res.id);

                            const uris = getThisWeeksDWSongs();
                            sdk.playlists.addItemsToPlaylist(res.id, uris)
                                .then((res) => {
                                    console.log(TAG, "items added successfully!");
                                })
                                .catch((e) => {
                                    console.error(e);

                                });
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }

            }).catch((err) => {
            console.error(err);
        });
    }

    return (
        <div className="discoverWeeklySaver">
            {!loading &&
                <>
                    <h1>Welcome {user.display_name}!!</h1>
                    <img className="usrImg" src={imageUrl} alt=""/>
                    <button onClick={saveSongsToCollection}>Save these songs!</button>
                    {/*<button onClick={searchForCollectionPlaylist}>search for collection!</button>*/}
                    {/*<button onClick={saveSongsToCollection}>save songs better</button>*/}
                    <div className="playlist">
                        <h2>Here's what's on your Discover Weekly this week!</h2>
                        <div className="tracks">
                        {
                            playlistItems.map((item) => {
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
            }
            {errorOnPage &&
                <div className="error">Something went wrong!</div>
            }
        </div>
    );
};

export default DiscoverWeeklySaver;
