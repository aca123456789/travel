import { db, users, travelNotes, noteMedia } from "./index";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function seed() {
  console.log("🌱 Seeding database...");
  
  try {
    // Clean up existing data
    await db.delete(noteMedia as any);
    await db.delete(travelNotes as any);
    await db.delete(users as any);
    
    console.log("Deleted existing data");
    
    // Create test users
    const passwordHash = await bcrypt.hash("password123", 10);
    
    const [user1] = await db.insert(users as any).values({
      username: "user1",
      passwordHash,
      nickname: "旅行家",
      role: "user",
      avatarUrl: "https://i.pravatar.cc/150?u=user1"
    }).returning();
    
    const [user2] = await db.insert(users as any).values({
      username: "user2",
      passwordHash,
      nickname: "背包客",
      role: "user",
      avatarUrl: "https://i.pravatar.cc/150?u=user2"
    }).returning();
    
    const [admin] = await db.insert(users as any).values({
      username: "admin",
      passwordHash,
      nickname: "管理员",
      role: "admin",
      avatarUrl: "https://i.pravatar.cc/150?u=admin"
    }).returning();
    
    console.log("Created users:", { user1: user1.id, user2: user2.id, admin: admin.id });
    
    // Create travel notes for user1
    const [note1] = await db.insert(travelNotes as any).values({
      userId: user1.id,
      title: "丽江古城之旅",
      content: `丽江古城是云南省丽江市的著名古城，也是中国为数不多的保存相当完好的少数民族古城之一，于1997年12月被联合国教科文组织列入世界文化遗产名录。丽江城区坐落在云南省西北部云贵高原，是中国西南重要的旅游城市。

丽江古城区有大研古城、束河古镇、白沙古镇等。丽江建城已有800多年历史，城内的街道依山傍水修建，以红色角砾岩铺就，有四方街、木府、五凤楼等景观。丽江民居建筑多为"三坊一照壁"、"四合五天井"、"一明两暗三阁楼"等布局形式。整座古城没有城墙，以水为城，街巷间流水贯通，有"东方威尼斯"之美誉。

主要看点：
1. 四方街：丽江古城的中心广场，是古代"茶马古道"上最大的集市之一
2. 木府：丽江木氏土司衙门，是丽江古城内最大的建筑群
3. 黑龙潭公园：丽江著名的风景区，有"玉龙雪山倒影"胜景
4. 束河古镇：比大研古城更加宁静的古镇，可以体验更原汁原味的纳西文化

旅行小贴士：
- 最佳旅游季节为春季和秋季，气候宜人
- 古城内住宿方便但价格较高，可以考虑古城周边
- 体验当地纳西族特色美食，如鸡豆凉粉、丽江粑粑等
- 请尊重当地少数民族文化和习俗`,
      location: "云南, 丽江",
      status: "approved",
    }).returning();
    
    // Add media to note1
    await db.insert(noteMedia as any).values([
      {
        noteId: note1.id,
        mediaType: "image",
        url: "https://images.unsplash.com/photo-1580637250481-b78db3e6f84b?q=80&w=1000",
        order: 0
      },
      {
        noteId: note1.id,
        mediaType: "image",
        url: "https://images.unsplash.com/photo-1590123252271-df638a5d3b0d?q=80&w=1000",
        order: 1
      },
      {
        noteId: note1.id,
        mediaType: "image",
        url: "https://images.unsplash.com/photo-1574308457713-aae0abb54c09?q=80&w=1000",
        order: 2
      },
      {
        noteId: note1.id,
        mediaType: "video",
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        order: 3
      }
    ]);
    
    // Create travel notes for user2
    const [note2] = await db.insert(travelNotes as any).values({
      userId: user2.id,
      title: "三亚海滩度假",
      content: `三亚是中国最著名的热带海滨城市，位于海南岛最南端。这里有中国最美丽的海滩之一，清澈的海水和洁白的沙滩吸引了无数游客。

我这次在三亚停留了5天，主要在亚龙湾、大东海和海棠湾三个海湾游玩。亚龙湾被称为"天下第一湾"，拥有7公里长的半月形海湾，沙质细腻，海水能见度高达10米以上，是潜水和游泳的绝佳去处。

海鲜美食是三亚旅行不可错过的体验，在第一市场和友谊路夜市，我品尝了各种新鲜的海鲜，价格比内地便宜很多，但要注意砍价。

景点推荐：
1. 蜈支洲岛：被称为"中国的马尔代夫"，可以体验各种水上活动
2. 南山文化旅游区：可以参观三亚标志性建筑108米高的海上观音像
3. 亚特兰蒂斯水世界：适合带孩子的家庭，有超多刺激的水上项目

旅行建议：
- 最佳旅游季节是10月到次年4月，避开台风季节
- 防晒措施一定要做足，三亚的阳光非常强烈
- 可以考虑租车自驾，三亚的公共交通不太便利
- 住宿建议选择海边酒店，能够欣赏到美丽的日出`,
      location: "海南, 三亚",
      status: "pending",
    }).returning();
    
    // Add media to note2
    await db.insert(noteMedia as any).values([
      {
        noteId: note2.id,
        mediaType: "image",
        url: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?q=80&w=1000",
        order: 0
      },
      {
        noteId: note2.id,
        mediaType: "image",
        url: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1000",
        order: 1
      }
    ]);
    
    // Create another note for user1 (rejected)
    const [note3] = await db.insert(travelNotes as any).values({
      userId: user1.id,
      title: "张家界峰林探险",
      content: `张家界位于湖南省西北部，以其独特的石英砂岩峰林地貌闻名于世。这次旅行我花了4天时间探索张家界国家森林公园和天门山。

张家界的地形地貌是世界上独一无二的，数千座石英砂岩峰林拔地而起，云雾缭绕，让人仿佛置身于仙境。电影《阿凡达》中的"哈利路亚山"就是以张家界的山峰为原型设计的。

黄石寨是欣赏张家界全景的最佳地点，站在观景台上，可以俯瞰整个峰林景观。金鞭溪沿线则是漫步于峰林之间的绝佳路线，溪水清澈，两岸峰林耸立，非常适合徒步。

天门山的天门洞是一个巨大的自然穿山溶洞，乘坐世界上最长的高山客运索道到达山顶后，还可以体验惊险刺激的玻璃栈道。

注意事项：
1. 景区内路线复杂，建议请当地向导或跟团游
2. 山上气温较低，即使夏天也要带件外套
3. 门票费用较高，可以购买联票节省开支
4. 旺季排队等候时间长，建议错峰出行`,
      location: "湖南, 张家界",
      status: "rejected",
      rejectionReason: "内容与图片不符，请修改后重新提交",
    }).returning();
    
    // Add media to note3
    await db.insert(noteMedia as any).values([
      {
        noteId: note3.id,
        mediaType: "image",
        url: "https://images.unsplash.com/photo-1513977055326-8ae6272d90a7?q=80&w=1000",
        order: 0
      }
    ]);
    
    console.log("Created travel notes:", { note1: note1.id, note2: note2.id, note3: note3.id });
    
    console.log("✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

await seed(); 
 