import React, {useEffect, useState} from "react";
import "./DiscoverWeeklySaver.css";
import {PlaylistedTrack, SpotifyApi, UserProfile} from "@spotify/web-api-ts-sdk";
interface DiscoverWeeklySaverProps {

}

const DiscoverWeeklySaver = (props: DiscoverWeeklySaverProps) =>{
    const TAG = "[DiscoverWeeklySaver.tsx]";

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

    function getThisWeeksDWSongs(){
        return playlistItems.map( (item) => {
            return item.track.uri;
        });
    }

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
        const dwName = "Discover Weekly Collection";//todo: make this a state var and allow user a textfield to enter the pl name they like!
        console.log("today", today);
        const playlistDetails = {
            "name": dwName,
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
                    const uris = getThisWeeksDWSongs();

                    const dwCollection = (await sdk.playlists.getPlaylistItems(plId)).items.map( (item) => {
                        return item.track.uri;
                    });
                    console.log(TAG, "dw collection length:", dwCollection.length);

                    // const songsNotAlreadyInAllTimePL = dwCollection.items.map( (track) => {
                    //     return track.track.uri;
                    // }).filter( (uri) => {
                    //     // console.log(TAG, uri);
                    //     if(!uris.includes(uri)){
                    //         console.log(TAG, "could not find item:", uri);
                    //     }
                    //     return !uris.includes(uri);
                    // });
                    const songsNotAlreadyInAllTimePL = uris.filter( (uri) => {
                       return !dwCollection.includes(uri);
                    });

                    // const savedSet = songsInSavedPl.m

                    //todo: only add items NOT in playlist currently.
                    sdk.playlists.addItemsToPlaylist(plId, songsNotAlreadyInAllTimePL)
                        .then( (res) => {
                            console.log(TAG, "items added successfully- not created");
                        }).catch(console.error);

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
            <h1>Welcome {user.display_name}!!</h1>
            <img className="usrImg" src={imageUrl} alt=""/>
            <button onClick={createPlaylist}>Save these songs!</button>
            <div className="playlist">
                <h2>Here's what's on your Discover Weekly this week!</h2>
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
    );
}

export default DiscoverWeeklySaver;
