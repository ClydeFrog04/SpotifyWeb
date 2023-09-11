import "./App.scss";
import {Route, Routes} from "react-router-dom";
import {PlaylistedTrack, SpotifyApi, Track, UserProfile} from "@spotify/web-api-ts-sdk";
import {useEffect, useState} from "react";

function App() {
    const TAG = "[APP.tsx]";
    const scopes = ["user-read-private", "user-read-email", "playlist-modify-public", "playlist-modify-private"];
    // console.log("env:", import.meta.env.MODE);
    // console.log("redirect target:", import.meta.env.VITE_REDIRECT_TARGET);
    const sdk = SpotifyApi.withUserAuthorization(import.meta.env.VITE_SPOTIFY_CLIENT_ID, import.meta.env.VITE_REDIRECT_TARGET, scopes);
    const [imageUrl, setImageUrl] = useState("");
    const [playlistItems, setPlaylistItems] = useState<PlaylistedTrack[]>([]);
    const [user, setUser] = useState<UserProfile>({} as UserProfile);


    /**
     * @returns boolean whether user profile was retrieved successfully
     */
    async function getCurrentUserProfile(): Promise<boolean> {
        return sdk.currentUser.profile()
            .then((profile) => {
                // console.log("profile:", JSON.stringify(profile.images[0].url));
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
    async function getDiscoverWeeklyItems(): Promise<boolean> {
        //37i9dQZF1EVKuMoAJjoTIw?si=ae9318c75dce445f idk what this pl is
        return sdk.playlists.getPlaylist("37i9dQZEVXcUNWRvFBILtY")//https://open.spotify.com/playlist/37i9dQZEVXcUNWRvFBILtY?si=a2855d37b8bf422c
            .then((playlist) => {
                // console.log("tracks:", JSON.stringify(playlist.tracks));
                // console.log(Object.keys(playlist.tracks.items));
                setPlaylistItems(playlist.tracks.items);
                console.log("DW ITEMS RETRIEVED YAYAYAYAYYA");
                // console.table(playlist.tracks.items.map((item) => ({
                //     name: item.track.name,
                //     artist: "artists" in item.track ? item.track.artists[0].name : item.track.description
                // })));
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


        getCurrentUserProfile().then(getDiscoverWeeklyItems).catch(console.error);

    }, []);

    function createPlaylist() {
        //
        console.log(TAG, user.id);
        const url = `https://api.spotify.com/v1/users/${user.id}/playlists`;
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
        const dwName = "Discover Weekly Collection";
        console.log("today", today);
        const playlistDetails = {
            "name": dwName,
            "description": "Testing creating a discover weekly playlist from react using spotify sdk/web api",
            "public": true
        };
        let plId: string | null = null;


        sdk.currentUser.playlists.playlists(50)//todo: need to repeat this for every 50 result offset until no more results so we can be sure we've checked every pl the user has
            .then((res) => {
                console.log(TAG, "number of search results:", res.items.length);

                for (let i = 0; i < res.items.length; i++) {
                    const item = res.items[i];
                    if (item.name === dwName) {
                        console.log(TAG, "the playlist already exists, leaving early so that we can add items!");
                        plId = item.id;
                        break;
                    }
                }

                console.log(TAG, "Playlist id:", plId);
                if (plId !== null) {
                    //add items
                    console.log(TAG, "pl exists, adding items:", playlistItems.length);
                    const uris = playlistItems.map( (item) => {
                        return item.track.uri;//todo: create getUris function
                    })
                    sdk.playlists.addItemsToPlaylist(plId, uris)
                        .then( (res) => {
                            console.log(TAG, "items added successfully- not created");
                        }).catch(console.error);

                } else {
                    console.log(TAG, "creating pl and adding items:", playlistItems.length);

                    sdk.playlists.createPlaylist(user.id, playlistDetails)
                        .then((res) => {
                            console.log(TAG, "playlist created!", res.id);

                            const uris = playlistItems.map((item) => {
                                // console.log(TAG, item.track.);
                                return item.track.uri;
                            });
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
        <>
            <div className="App">
                <Routes>
                    <Route
                        path={"/"}
                        element={
                            <div className={"home"}>
                                <img src={imageUrl} alt=""/>
                                <button onClick={createPlaylist}>create playlist!</button>
                                <div className="playlist">
                                    {
                                        playlistItems.map((item) => {
                                            const name = item.track.name;
                                            const id = item.track.id;

                                            //todo: make secondary request for when item is an episode to get the creators name.
                                            const artist = "artists" in item.track ? item.track.artists[0].name : "Get Creator";
                                            return (
                                                <div className={"track"} key={id}>
                                                    <div className="name">{name}</div>
                                                    -
                                                    <div className="artist">{artist}</div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        }
                    />
                </Routes>
            </div>
        </>
    );
}

export default App;
