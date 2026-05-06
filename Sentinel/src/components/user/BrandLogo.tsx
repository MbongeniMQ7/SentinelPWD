import logo from "@/assets/logo.png";

const imgSize = { sm: "h-7", md: "h-9", lg: "h-12" };
const textSize = { sm: "text-sm", md: "text-base", lg: "text-xl" };

export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logo}
        alt="SentinelAI"
        className={`${imgSize[size]} w-auto object-contain`}
      />
      <div className="flex flex-col leading-tight">
        <span className={`${textSize[size]} font-display font-bold tracking-tight text-navy`}>
          SentinelAI
        </span>
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
          Workforce
        </span>
      </div>
    </div>
  );
}
