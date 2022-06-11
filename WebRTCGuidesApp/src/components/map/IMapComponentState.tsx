interface Tag  {
    tag_id: number;
    alias: string;
    coordinates: string;
    user: number;
}
interface MapComponentState { 
    openedSideBar :  boolean,
    markerSideBar :  any,
    arrayDataPositions: any,
    arrayTags: Tag[],
    arrayTalesTags: any,
    runningDemo: boolean,
    map: any

}


export default MapComponentState
