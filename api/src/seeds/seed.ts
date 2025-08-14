/*
 * Seed script to populate the database with demo / development data.
 * Idempotent: running multiple times won't duplicate already seeded entities (based on deterministic emails & direct conversation logic).
 * Configuration via env vars:
 *   SEED_USERS (default 25)
 *   SEED_DIRECT_PAIRS (default 15)
 *   SEED_MESSAGES_MIN (default 5)
 *   SEED_MESSAGES_MAX (default 25)
 *   SEED_PASSWORD (default Passw0rd!)
 *   SEED_GROUPS (default 3)
 *   SEED_GROUP_SIZE_MIN (default 3)
 *   SEED_GROUP_SIZE_MAX (default 6)
 *   SEED_VERBOSE=1 for more logs
 *   SEED_RESET=1 to wipe dynamic tables first (danger: truncates messages, participants, conversations)
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  Conversation,
  ConversationType,
} from '../chat/entities/conversation.entity';
import { ConversationParticipant } from '../chat/entities/conversationParticipant.entity';
import {
  Message,
  MessageStatus,
  MessageType,
} from '../chat/entities/message.entity';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

interface SeedConfig {
  users: number;
  directPairs: number;
  messagesMin: number;
  messagesMax: number;
  password: string;
  groups: number;
  groupSizeMin: number;
  groupSizeMax: number;
  verbose: boolean;
  reset: boolean;
}

function loadConfig(): SeedConfig {
  return {
    users: parseInt(process.env.SEED_USERS || '10', 10),
    directPairs: parseInt(process.env.SEED_DIRECT_PAIRS || '100', 10),
    messagesMin: parseInt(process.env.SEED_MESSAGES_MIN || '25', 10),
    messagesMax: parseInt(process.env.SEED_MESSAGES_MAX || '100', 10),
    password: process.env.SEED_PASSWORD || 'Passw0rd!',
    groups: parseInt(process.env.SEED_GROUPS || '3', 10),
    groupSizeMin: parseInt(process.env.SEED_GROUP_SIZE_MIN || '3', 10),
    groupSizeMax: parseInt(process.env.SEED_GROUP_SIZE_MAX || '6', 10),
    verbose: process.env.SEED_VERBOSE === '1',
    reset: process.env.SEED_RESET === '1',
  };
}

function log(cfg: SeedConfig, ...args: unknown[]) {
  if (cfg.verbose) console.log('[seed]', ...args);
}

async function truncateDynamic(ds: DataSource, cfg: SeedConfig) {
  log(cfg, 'Truncating dynamic tables...');
  // Order matters due to FK constraints
  await ds.query('TRUNCATE TABLE messages RESTART IDENTITY CASCADE');
  await ds.query(
    'TRUNCATE TABLE conversation_participants RESTART IDENTITY CASCADE',
  );
  await ds.query('TRUNCATE TABLE conversations RESTART IDENTITY CASCADE');
  // Users intentionally kept (remove below if full wipe wanted)
}

async function seedUsers(ds: DataSource, cfg: SeedConfig): Promise<User[]> {
  const repo = ds.getRepository(User);
  const existing = await repo.count();
  const users: User[] = [];
  const target = cfg.users;
  const saltRounds = 10;
  for (let i = 0; i < target; i++) {
    const email = `demo${i}@example.test`;
    let user = await repo.findOne({ where: { email } });
    if (!user) {
      const hash = await bcrypt.hash(cfg.password, saltRounds);
      user = repo.create({
        email,
        password: hash,
        name: faker.person.fullName(),
      });
      user = await repo.save(user);
      log(cfg, 'Created user', email);
    }
    users.push(user);
  }
  log(cfg, `Users total before: ${existing} after: ${await repo.count()}`);
  return users;
}

async function findDirectConversation(
  ds: DataSource,
  aId: string,
  bId: string,
): Promise<Conversation | null> {
  const sorted = [aId, bId].sort();
  return ds
    .getRepository(Conversation)
    .createQueryBuilder('c')
    .innerJoin(
      ConversationParticipant,
      'p1',
      'p1.conversationId = c.id AND p1.userId = :u1',
      { u1: sorted[0] },
    )
    .innerJoin(
      ConversationParticipant,
      'p2',
      'p2.conversationId = c.id AND p2.userId = :u2',
      { u2: sorted[1] },
    )
    .leftJoin(ConversationParticipant, 'pAll', 'pAll.conversationId = c.id')
    .where('c.type = :type', { type: ConversationType.DIRECT })
    .groupBy('c.id')
    .having('COUNT(DISTINCT pAll.userId) = 2')
    .getOne();
}

async function createDirectConversation(
  ds: DataSource,
  cfg: SeedConfig,
  aId: string,
  bId: string,
): Promise<Conversation> {
  const existing = await findDirectConversation(ds, aId, bId);
  if (existing) return existing;
  const convoRepo = ds.getRepository(Conversation);
  const participantRepo = ds.getRepository(ConversationParticipant);
  let convo = convoRepo.create({ type: ConversationType.DIRECT });
  convo = await convoRepo.save(convo);
  await participantRepo.insert([
    { conversationId: convo.id, userId: aId },
    { conversationId: convo.id, userId: bId },
  ]);
  log(cfg, 'Created direct conversation', convo.id, 'between', aId, bId);
  return convo;
}

async function createGroupConversation(
  ds: DataSource,
  cfg: SeedConfig,
  userIds: string[],
  title?: string,
): Promise<Conversation> {
  const convoRepo = ds.getRepository(Conversation);
  const participantRepo = ds.getRepository(ConversationParticipant);
  let convo = convoRepo.create({ type: ConversationType.GROUP, title });
  convo = await convoRepo.save(convo);
  await participantRepo.insert(
    userIds.map((userId) => ({ conversationId: convo.id, userId })),
  );
  log(
    cfg,
    'Created group conversation',
    convo.id,
    'title',
    title,
    'size',
    userIds.length,
  );
  return convo;
}

async function seedDirectConversations(
  ds: DataSource,
  cfg: SeedConfig,
  users: User[],
): Promise<Conversation[]> {
  // Generate all unique unordered user pairs (combinations) rather than the previous mirrored pairing
  const allPairs: [User, User][] = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      allPairs.push([users[i], users[j]]);
    }
  }

  // Shuffle for variety across runs (faker seeded earlier for determinism unless seed changes)
  const shuffled = faker.helpers.shuffle(allPairs);
  const limit = Math.min(cfg.directPairs, shuffled.length);
  const convos: Conversation[] = [];

  for (let k = 0; k < limit; k++) {
    const [a, b] = shuffled[k];
    const convo = await createDirectConversation(ds, cfg, a.id, b.id);
    convos.push(convo);
  }
  log(
    cfg,
    `Direct conversations requested (SEED_DIRECT_PAIRS): ${cfg.directPairs}, created/ensured: ${convos.length}`,
  );
  return convos;
}

async function seedGroupConversations(
  ds: DataSource,
  cfg: SeedConfig,
  users: User[],
): Promise<Conversation[]> {
  const convos: Conversation[] = [];
  for (let g = 0; g < cfg.groups; g++) {
    const size = faker.number.int({
      min: cfg.groupSizeMin,
      max: cfg.groupSizeMax,
    });
    const shuffled = faker.helpers.shuffle(users.map((u) => u.id));
    const participants = Array.from(new Set(shuffled.slice(0, size)));
    if (participants.length < 3) continue; // enforce min size 3
    const title = faker.commerce.department() + ' chat';
    const convo = await createGroupConversation(ds, cfg, participants, title);
    convos.push(convo);
  }
  log(cfg, `Group conversations created: ${convos.length}`);
  return convos;
}

async function seedMessages(
  ds: DataSource,
  cfg: SeedConfig,
  conversations: Conversation[],
): Promise<number> {
  const msgRepo = ds.getRepository(Message);
  let total = 0;
  for (const convo of conversations) {
    // fetch participants for sender pool
    const participants = await ds
      .getRepository(ConversationParticipant)
      .find({ where: { conversationId: convo.id } });
    if (!participants.length) continue;
    const count = faker.number.int({
      min: cfg.messagesMin,
      max: cfg.messagesMax,
    });
    const batch: Message[] = [];
    for (let i = 0; i < count; i++) {
      const sender = faker.helpers.arrayElement(participants);
      batch.push(
        msgRepo.create({
          conversationId: convo.id,
          senderId: sender.userId,
          content: faker.lorem.sentence(),
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
        }),
      );
    }
    await msgRepo.save(batch, { chunk: 100 });
    total += batch.length;
    log(cfg, `Messages for convo ${convo.id}: ${batch.length}`);
  }
  log(cfg, `Total messages inserted: ${total}`);
  return total;
}

async function main() {
  const cfg = loadConfig();
  faker.seed(12345); // determinism across runs for reproducibility of content order
  console.log('Seeding with config:', cfg);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: cfg.verbose ? ['log', 'error', 'warn'] : ['error'],
  });
  const dataSource = app.get(DataSource);

  try {
    if (cfg.reset) {
      await truncateDynamic(dataSource, cfg);
    }
    const users = await seedUsers(dataSource, cfg);
    await seedDirectConversations(dataSource, cfg, users);
    await seedGroupConversations(dataSource, cfg, users);
    // Ensure every user is in at least one GROUP conversation
    const participantRepo = dataSource.getRepository(ConversationParticipant);
    const convoRepo = dataSource.getRepository(Conversation);
    const existingGroups = await convoRepo.find({
      where: { type: ConversationType.GROUP },
    });
    const existingGroupIds = new Set(existingGroups.map((c) => c.id));
    const existingParticipants = await participantRepo.find();
    const usersWithGroup = new Set(
      existingParticipants
        .filter((p) => existingGroupIds.has(p.conversationId))
        .map((p) => p.userId),
    );
    const missingGroupUsers = users.filter((u) => !usersWithGroup.has(u.id));
    if (missingGroupUsers.length) {
      const allIds = users.map((u) => u.id);
      const queue = missingGroupUsers.map((u) => u.id);
      const newGroups: string[][] = [];
      while (queue.length) {
        if (queue.length >= 3) {
          newGroups.push(queue.splice(0, Math.min(5, queue.length)));
        } else {
          const needed = 3 - queue.length;
          const base = queue.splice(0, queue.length);
          const fillers = faker.helpers.arrayElements(
            allIds.filter((id) => !base.includes(id)),
            needed,
          );
          newGroups.push([...base, ...fillers]);
        }
      }
      for (const grp of newGroups) {
        await createGroupConversation(
          dataSource,
          cfg,
          Array.from(new Set(grp)),
          'Auto group',
        );
      }
      log(
        cfg,
        `Created ${newGroups.length} extra group(s) to cover ${missingGroupUsers.length} user(s) without a group`,
      );
    }

    // Seed messages for all conversations including any newly created groups
    const allConvos = await convoRepo.find();
    await seedMessages(dataSource, cfg, allConvos);
    console.log('Seed completed ✔');
  } catch (err) {
    console.error('Seed failed', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
