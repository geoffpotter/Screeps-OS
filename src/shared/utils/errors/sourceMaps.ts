//Build process will add an export here called sourceMaps containing an object with all the source maps by file name



interface SourceMaps {
  [file:string]:Function
}
let sourceMaps = {
  //@ts-ignore
  _SOURCE_MAPS_
} as SourceMaps

export default sourceMaps
