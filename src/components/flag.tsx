import Image from "next/image";

export default function Flag({
  countryCode,
  size,
}: {
  countryCode: string;
  size: number;
}) {
  return (
    <Image
      alt={countryCode}
      width={size}
      height={size * 0.75} // Adjust height for aspect ratio
      src={`https://flagpedia.net/data/flags/emoji/apple/160x160/${countryCode.toLocaleLowerCase()}.png`}
    />
  );
}
