import React from 'react'
import Room, { ROOM, WALLS } from './Room.jsx'
import CameraRig from './CameraRig.jsx'
import { wasDrag } from './pointer.js'
import Polaroid, { CARD_H } from './Polaroid.jsx'
import CaseFile from './CaseFile.jsx'
import Strings from './Strings.jsx'
import { QueueWall, LessonsWall } from './Notes.jsx'
import ScoreMarks from './ScoreMarks.jsx'
import Archive from './Archive.jsx'
import { WallQuotes } from './Quotes.jsx'
import Signs from './Signs.jsx'
import Nights from './Nights.jsx'

const HD = ROOM.D / 2
const HW = ROOM.W / 2
const WALL_Z = -HD + 0.014

// Clicking a wall takes you to what is ON that wall. East used to map to the
// Investigation, whose viewpoint faces NORTH — so clicking the nightstand wall
// in front of you turned you a hundred and eighty degrees to look behind you.
// East is the nightstand, so east opens the drawer that is in it.
const WALL_STATION = { north: 'ledger', east: 'drawer', south: 'door', west: 'mirror' }

// Invisible click targets so looking at a wall and clicking takes you to it.
function WallZone({ wall, onGo }) {
  const w = WALLS[wall]
  return (
    <mesh
      position={w.pos}
      rotation={w.rot}
      onClick={(e) => { e.stopPropagation(); if (!wasDrag()) onGo(wall) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      <planeGeometry args={w.size} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}

// The motel room. Extracted from App.jsx (2026-08-21), zero behavior change —
// this is everything that used to render directly inside the Canvas: the room
// itself, the wall of Polaroids, the archive, the string between films that
// rhyme. It exists as its own component so the film-world portal has a world
// to leave FROM and to return TO; App owns all the state, this just renders it.
export default function MotelWorld({
  data,
  thread,
  view,
  openBox,
  picked,
  selected,
  hover,
  lens,
  scoreToY,
  placed,
  byPlace,
  pinPoints,
  quotesBySlug,
  ledgerQuotes,
  looseQuotes,
  openFilm,
  setSelected,
  setStation,
  setOpenBox,
  setPicked,
  setHover,
  goBox,
  openBoxAt,
  onEnter,
}) {
  return (
    <>
      <Room
        dim={thread}
        drawerOpen={openBox === 'drawer'}
        onDrawer={() => goBox('drawer')}
      />
      <CameraRig station={view.station} stationKey={view.key} />

      {Object.keys(WALLS).map((w) => (
        <WallZone
          key={w}
          wall={w}
          onGo={(k) => {
            const to = WALL_STATION[k]
            setSelected(null)
            if (to === 'drawer') return openBoxAt('drawer')
            setOpenBox(null)
            setPicked(null)
            setStation(to)
          }}
        />
      ))}

      {/* every region says what it is, in the room */}
      <Signs data={data} />

      <ScoreMarks scoreToY={scoreToY} avg={data?.avg} z={WALL_Z - 0.004} />

      {/* time, given its own object rather than forced onto the hang */}
      <Nights
        films={data?.films}
        z={WALL_Z - 0.002}
        lens={lens}
        selected={selected}
        hover={hover}
        onSelect={(slug) => { setStation('ledger'); setSelected(slug) }}
        onHover={setHover}
      />

      {placed.map((p) => (
        <Polaroid
          key={p.film.slug}
          film={p.film}
          position={p.position}
          rotation={p.rotation}
          inspected={selected === p.film.slug}
          dimmed={!!lens && !(p.film.vibes || []).includes(lens)}
          onSelect={(f) => setSelected(f.slug)}
          onHover={setHover}
        />
      ))}

      {/* the door wall: what's next. Offset left so the slips don't hang
          across the actual door, which sits at x = 0.95 */}
      {data?.queue?.length > 0 && (
        <QueueWall queue={data.queue} origin={[-0.62, 0, HD - 0.016]} rotation={[0, Math.PI, 0]} />
      )}

      {/* the mirror wall: what he likes. Pushed off the window at z = 0.75 */}
      {data?.lessons?.length > 0 && (
        <LessonsWall lessons={data.lessons} origin={[-HW + 0.016, 0, -0.45]} rotation={[0, Math.PI / 2, 0]} />
      )}

      {/* the archive: everything he has watched but never scored live */}
      <Archive
        shoebox={data?.shoebox || []}
        drawer={data?.drawer || []}
        quotesBySlug={quotesBySlug}
        looseQuotes={looseQuotes}
        open={openBox}
        picked={picked}
        onOpen={goBox}
        onPick={setPicked}
      />

      {/* lines he wrote down, taped under the film that said them */}
      {ledgerQuotes.length > 0 && (
        <WallQuotes quotes={ledgerQuotes} positions={pinPoints} cardH={CARD_H} />
      )}

      {/* the reading sheet, hung in the room beside the card it belongs to */}
      {openFilm && (
        <CaseFile
          film={openFilm}
          links={data?.links || []}
          anchor={byPlace[selected].position}
          onClose={() => setSelected(null)}
          onJump={(slug) => setSelected(slug)}
          onEnter={onEnter}
        />
      )}

      {thread && (
        <Strings
          links={data?.links || []}
          positions={pinPoints}
          focus={selected || hover}
        />
      )}
    </>
  )
}
