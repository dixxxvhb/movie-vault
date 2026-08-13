// How far the pointer travelled during the last press.
//
// Every click handler in the room consults this so that "drag to look around"
// never also counts as "click whatever was behind the cursor". It lives in its
// own module rather than in CameraRig because room objects (which CameraRig
// imports geometry from) need it too, and the resulting import cycle would
// break the dev server even though the bundler happened to hoist past it.

let lastDragDistance = 0

export const setDragDistance = (d) => { lastDragDistance = d }
export const wasDrag = () => lastDragDistance > 6
