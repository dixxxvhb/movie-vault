import React from 'react'
import GenericRoom from '../GenericRoom.jsx'
import ArchivePencilInfo from './ArchivePencilInfo.jsx'
import { useRoomDevelop } from './useRoomDevelop.js'

// The shoebox print's room: the SAME template engine every Ledger film goes
// through (brief §3: "same geometry ... rendered FADED"), just handed a
// config built by archiveConfig.js's fadedConfigFor() (a genre-mapped
// preset, pushed down) instead of a CONFIGS[slug] entry, and a
// pencil-styled info surface instead of InfoSurfaces' Ledger one.
//
// `film` here is a shoebox print record (title/memory/snap/note/genres —
// see public/vault-data.json), not a Ledger film — named `film` only because
// that's the prop GenericRoom/ArchivePencilInfo already expect.
export default function FadedRoom({ film, config, infoVisible = true }) {
  // Phase 3: certify-develops-the-room. Ordinary visits render `config`
  // completely untouched (useRoomDevelop hands the same object straight
  // back until something actually triggers it) — see useRoomDevelop.js and
  // developBus.js for the two ways that can happen.
  const liveConfig = useRoomDevelop(config, film, film?.slug)
  return (
    <GenericRoom
      film={film}
      config={liveConfig}
      infoVisible={infoVisible}
      InfoComponent={ArchivePencilInfo}
    />
  )
}
