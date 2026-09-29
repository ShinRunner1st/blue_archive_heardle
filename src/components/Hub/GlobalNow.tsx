import React from "react";

import {
  formatLeft,
  isEmpty,
  nowFile,
  runningAt,
} from "../../helpers/globalNow";
import { useGlobalNow } from "../../hooks/useGlobalNow";
import { Portrait, usePortraits } from "../Portrait";

import * as Styled from "./index.styled";

const SCHALEDB = "https://schaledb.com/";

/** "Ends in 3d 4h". */
function Ends({ end, now }: { end: number; now: number }) {
  return <Styled.Ends>ends in {formatLeft(end * 1000 - now)}</Styled.Ends>;
}

/** The event's logo, which carries its name; the name if it doesn't load. */
function EventName({ name, logo }: { name: string; logo?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (!logo || failed) return <Styled.RowText>{name}</Styled.RowText>;
  return (
    <Styled.EventLogo
      src={nowFile(logo)}
      alt={name}
      title={name}
      width={180}
      height={60}
      onError={() => setFailed(true)}
    />
  );
}

/** The raid boss, faded in behind its row; nothing if it doesn't load. */
function Boss({ picture }: { picture: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;
  return (
    <Styled.Boss
      src={nowFile(picture)}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

/**
 * What is on in Blue Archive Global now: the pickup students, the event and
 * the raids, from SchaleDB by way of our own Worker (see useGlobalNow).
 * Anything that has ended is left out, and so is the panel when nothing is
 * left, or the file didn't come.
 */
export function GlobalNow() {
  const data = useGlobalNow();
  const now = Date.now();
  const running = data && runningAt(data, now);
  const pickup = running?.banners.flatMap((banner) => banner.students) ?? [];
  const portraits = usePortraits(pickup.map(({ id }) => id));

  if (!running || isEmpty(running)) return null;

  return (
    <Styled.Panel aria-labelledby="hub-global">
      <Styled.PanelHead>
        <Styled.PanelTitle id="hub-global">Now in Global</Styled.PanelTitle>
        <Styled.Source
          href={SCHALEDB}
          target="_blank"
          rel="noopener noreferrer"
        >
          from SchaleDB
        </Styled.Source>
      </Styled.PanelHead>

      {running.banners.map((banner, index) => (
        <Styled.Row key={`banner-${index}`}>
          <Styled.RowHead>
            <Styled.Kind>Pickup</Styled.Kind>
            <Ends end={banner.end} now={now} />
          </Styled.RowHead>
          <Styled.Pickup>
            {banner.students.map(({ id, name }) => {
              const url = portraits.get(id);
              return (
                <Styled.PickupStudent key={id}>
                  {url && <Portrait url={url} size={36} />}
                  <span>{name}</span>
                </Styled.PickupStudent>
              );
            })}
          </Styled.Pickup>
        </Styled.Row>
      ))}

      {running.events.map((event, index) => (
        <Styled.Row key={`event-${index}`}>
          <Styled.RowHead>
            <Styled.Kind>Event</Styled.Kind>
            <Ends end={event.end} now={now} />
          </Styled.RowHead>
          <EventName name={event.name} logo={event.logo} />
        </Styled.Row>
      ))}

      {running.raids.map((raid, index) => (
        <Styled.Row key={`raid-${index}`} $raid>
          {raid.picture && <Boss picture={raid.picture} />}
          <Styled.RowHead>
            <Styled.Kind>{raid.kind}</Styled.Kind>
            <Ends end={raid.end} now={now} />
          </Styled.RowHead>
          {raid.name && (
            <Styled.RowText>
              {raid.name}
              {raid.terrain && (
                <Styled.Terrain> · {raid.terrain}</Styled.Terrain>
              )}
            </Styled.RowText>
          )}
        </Styled.Row>
      ))}
    </Styled.Panel>
  );
}
