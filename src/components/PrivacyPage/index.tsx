import privacy from "../../content/privacy.json";

import * as Styled from "./index.styled";

/** The policy's date as players read it: "2 October 2026". */
const updatedOn = new Date(`${privacy.updated}T00:00:00Z`).toLocaleDateString(
  "en-GB",
  { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
);

/** A paragraph, with the contact address as a link where it says so. */
function Paragraph({ text }: { text: string }) {
  const [before, after] = text.split("{contact}");
  return (
    <Styled.Text>
      {before}
      {after !== undefined && (
        <>
          <Styled.Link href={`mailto:${privacy.contact}`}>
            {privacy.contact}
          </Styled.Link>
          {after}
        </>
      )}
    </Styled.Text>
  );
}

/**
 * The privacy policy, /privacy (docs/accounts.md, section 8), from
 * src/content/privacy.json: what the site keeps, for guests and for an
 * account, and how to download or delete it. Linked from the footer, About
 * and the Account tab, and from Google's and Discord's sign-in screens. A
 * lazy chunk: only this page loads it.
 */
export default function PrivacyPage() {
  return (
    <Styled.Page aria-labelledby="privacy-title">
      <Styled.Title id="privacy-title">Privacy</Styled.Title>
      <Styled.Updated>Last changed {updatedOn}</Styled.Updated>
      <Styled.Text>{privacy.intro}</Styled.Text>
      {privacy.sections.map((section) => (
        <Styled.Section
          key={section.id}
          aria-labelledby={`privacy-${section.id}`}
        >
          <Styled.Heading id={`privacy-${section.id}`}>
            {section.title}
          </Styled.Heading>
          {"paragraphs" in section &&
            section.paragraphs?.map((text) => (
              <Paragraph key={text} text={text} />
            ))}
          {"list" in section && section.list && (
            <Styled.List>
              {section.list.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </Styled.List>
          )}
        </Styled.Section>
      ))}
    </Styled.Page>
  );
}
