import { exampleCharacter } from "../fixtures/example-character";
import { CharacterEditor } from "./character-editor";

export default function Home() {
  return <CharacterEditor initialCharacter={exampleCharacter} />;
}
