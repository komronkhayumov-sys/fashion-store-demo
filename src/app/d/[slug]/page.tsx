import StorefrontView from "@/components/store/StorefrontView";

export const dynamic = "force-dynamic";

export default async function ClientDemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StorefrontView initialDemoSlug={decodeURIComponent(slug)} />;
}
