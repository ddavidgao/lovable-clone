import { prisma } from "@/lib/db";

const Page = async () => {
  const users = await prisma.user.findMany();

  return (
    <div>
      Hello World!
    </div>
  );
}

export default Page;