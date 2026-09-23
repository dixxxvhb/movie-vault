import React from 'react'
import KitArrivalCard, { arrivalWanted } from '../../kit/ArrivalCard.jsx'

// CHAPTER SIX: A GUEST IN PARIS. The film tells itself in five chapters;
// walking into its cinema is the sixth, and the visitor is the one it is
// about. The card itself is the kit's (src/rooms/kit/ArrivalCard.jsx).
export { arrivalWanted }
export default function ArrivalCard({ onDone }) {
  return <KitArrivalCard kicker="CHAPTER SIX" title="A Guest in Paris" flashKey="basterds-arrival" onDone={onDone} />
}
