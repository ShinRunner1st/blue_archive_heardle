import React from "react";
import styled from "styled-components";

import { makePicture } from "./api";
import type { PictureEntry, PictureMade, PictureStyle } from "./pictureRules";
import { Button, Card, Field, Hint, Input, Note, Row, Select } from "./ui";

export const STYLE_LABELS: Record<PictureStyle, string> = {
  "backdrop-day": "A backdrop like the seasons', by day: blurred and dimmed",
  "backdrop-night": "A backdrop like the seasons', by night: darker",
  scene: "A sharp scene, 960×540, for cards and banners",
  card: "A hub card's scene, 720×320, sharp",
  banner: "A banner's picture, 640×160, sharp",
  cover: "An album cover, 256×256",
};

const Drop = styled.label<{ $over: boolean }>`
  display: grid;
  place-items: center;
  min-height: 72px;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  border: 2px dashed
    ${({ $over, theme }) => ($over ? theme.blue : "rgba(255, 255, 255, 0.25)")};
  text-align: center;
  cursor: pointer;

  input {
    display: none;
  }
`;

const size = (kb: number) =>
  kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;

/** How a picture came out, in a line: "3.4 MB → 52 KB, quality 64…". */
function madeLine(made: PictureMade | undefined): string {
  if (!made) return "";
  if (made.sourceKb === undefined) return `Made: ${size(made.kb)}.`;
  return `Made: ${size(made.sourceKb)} → ${size(made.kb)}, WebP quality ${
    made.quality
  }, as alike as SSIM ${
    made.ssim
  } (compressed as far as it still looks the same).`;
}

/** The biggest upload the server takes, with room for base64. */
const MAX_UPLOAD = 18 * 1024 * 1024;

/**
 * Makes a picture where `target` says, from a file dropped in or one of the
 * game's backgrounds by its wiki name, in one of `styles`; the project's
 * own scripts do the work, and the picture list is rebuilt after.
 */
export function PictureMaker({
  target,
  styles,
  background = "",
  onMade,
  onBefore,
  makeLabel = "Make it",
}: {
  target: string;
  styles: PictureStyle[];
  /** A background to start from, such as a season's scene. */
  background?: string;
  onMade: (pictures: PictureEntry[]) => void;
  /**
   * Just before it's made: the draft can name the new file first, as a
   * file new to the site's own pictures reloads the page as it lands.
   */
  onBefore?: () => void;
  makeLabel?: string;
}) {
  const [from, setFrom] = React.useState<"upload" | "background">(
    background ? "background" : "upload"
  );
  const [upload, setUpload] = React.useState<{ name: string; data: string }>();
  const [name, setName] = React.useState(background);
  const [style, setStyle] = React.useState<PictureStyle>(styles[0]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [over, setOver] = React.useState(false);
  const [made, setMade] = React.useState("");

  React.useEffect(() => setName(background), [background]);

  const take = (file: File | undefined) => {
    if (!file) return;
    // A drop skips the input's accept list, so it's checked here too.
    if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type)) {
      setError(
        file.type === "image/svg+xml"
          ? "An SVG isn't a picture here: it goes in a frame's ornament (Rewards → Frames → Your SVG file)."
          : "That isn't a picture this takes: PNG, JPEG, WebP, GIF or AVIF."
      );
      return;
    }
    if (file.size > MAX_UPLOAD) {
      setError("That picture is over 18 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setUpload({ name: file.name, data: String(reader.result) });
    reader.readAsDataURL(file);
    setError("");
  };

  const make = async () => {
    setBusy(true);
    setError("");
    onBefore?.();
    const result = await makePicture({
      target,
      style,
      ...(from === "upload" ? { upload: upload?.data } : { background: name }),
    }).catch((reason: unknown) => ({
      ok: false as const,
      error: String(reason),
    }));
    setBusy(false);
    if (result.ok) {
      setUpload(undefined);
      setMade(madeLine(result.made));
      onMade(result.pictures);
    } else setError(result.error);
  };

  return (
    <Card>
      <Field label="From">
        <Select
          name="picture-from"
          value={from}
          onChange={(event) =>
            setFrom(event.target.value as "upload" | "background")
          }
        >
          <option value="upload">A picture file</option>
          <option value="background">One of the game&apos;s backgrounds</option>
        </Select>
      </Field>
      {from === "upload" ? (
        <Drop
          $over={over}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            take(event.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            name="picture-file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={(event) => take(event.target.files?.[0])}
          />
          {upload ? (
            <span>
              <strong>{upload.name}</strong>
              <br />
              <small>Drop another to change it</small>
            </span>
          ) : (
            <span>Drop a picture here, or click to pick one</span>
          )}
        </Drop>
      ) : (
        <Field
          label="Background"
          hint={
            <>
              Its name on the Blue Archive wiki, without BG_ and .jpg: File:
              BG_FireplaceDormitory.jpg is FireplaceDormitory. Downloaded once,
              here; the game never asks the wiki.
            </>
          }
        >
          <Input
            name="picture-background"
            value={name}
            placeholder="FireplaceDormitory"
            onChange={(event) => setName(event.target.value.trim())}
          />
        </Field>
      )}
      {styles.length > 1 && (
        <Field label="Made as">
          <Select
            name="picture-style"
            value={style}
            onChange={(event) => setStyle(event.target.value as PictureStyle)}
          >
            {styles.map((option) => (
              <option key={option} value={option}>
                {STYLE_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {error && <Note $tone="bad">{error}</Note>}
      {made && <Note $tone="good">{made}</Note>}
      <Row>
        <Button
          $variant="primary"
          disabled={busy || (from === "upload" ? !upload : !name)}
          onClick={make}
        >
          {busy ? "Making…" : makeLabel}
        </Button>
        <Hint>{target}</Hint>
      </Row>
    </Card>
  );
}
