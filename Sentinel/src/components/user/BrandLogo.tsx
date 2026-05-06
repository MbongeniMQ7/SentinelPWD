import logo from "@/assets/logo.png";

const sizeMap = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
};

export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <img
      src={logo}
      alt="SentinelAI"
      className={`${sizeMap[size]} w-auto object-contain`}
    />
  );
}
