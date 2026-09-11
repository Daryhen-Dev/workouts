// Shell servidor de / (§2.3): encabezado estático en español; la selección de
// modo vive en la única entrada cliente, HomeScreen.
import { HomeScreen } from "@/components/home/HomeScreen";
import { BRAND } from "@/components/shared/copy";

export default function Home() {
  return (
    <section aria-labelledby="inicio">
      <h1 id="inicio" className="text-2xl font-bold">
        {BRAND}
      </h1>
      <HomeScreen />
    </section>
  );
}
