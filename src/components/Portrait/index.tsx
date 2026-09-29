import React from "react";

import { audioBaseUrl, backupUrlFor } from "../../helpers/audioUrl";

import * as Styled from "./index.styled";

/**
 * The students' portraits on the Worker, by id, once their list has loaded.
 * The list (portraitFiles.ts, which the Sensei card uses too) is its own
 * chunk, loaded only where a portrait shows, and each portrait is about
 * 7.5 KB: the icon sheet would be 450 KB for an OST player. Students with no
 * portrait yet, as one new on Global before `npm run students`, are left out.
 */
export function usePortraits(ids: number[]): Map<number, string> {
  const [urls, setUrls] = React.useState<Map<number, string>>(new Map());
  const key = ids.join(",");

  React.useEffect(() => {
    if (!key) return;
    let live = true;
    import("../../constants/portraitFiles")
      .then(({ portraitFiles }) => {
        if (!live) return;
        const found = new Map<number, string>();
        for (const id of key.split(",").map(Number)) {
          const file = portraitFiles[`portraits/${id}`];
          if (file) found.set(id, `${audioBaseUrl()}/${file}`);
        }
        setUrls(found);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key]);

  return urls;
}

/**
 * A student's face in a circle, from its copy on R2 if the Worker fails; gone
 * if both do. Decorative: the name is always beside it.
 */
export function Portrait({ url, size }: { url: string; size: number }) {
  const [src, setSrc] = React.useState(url);
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;
  return (
    <Styled.Portrait
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => {
        const backup = backupUrlFor(url);
        if (backup && src !== backup) setSrc(backup);
        else setFailed(true);
      }}
    />
  );
}
