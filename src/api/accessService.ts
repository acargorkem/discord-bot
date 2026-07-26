import type { Client } from "discord.js";
import { grantAccess, listAccess as dbListAccess, revokeAccess } from "../lib/access.js";

/** Yetki seçiminde gösterilecek bir sunucu üyesi. */
export interface MemberInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Panele erişimi olan bir kullanıcının panel görünümü. */
export interface AccessView {
  userId: string;
  username: string;
  /** Sahip (env) mi? Sahipler kaldırılamaz. */
  isOwner: boolean;
  grantedBy: string | null;
  grantedAt: number | null;
}

export interface AccessResult {
  ok: boolean;
  message: string;
}

/**
 * Panel yetki yönetimi: sunucu üyelerini listeler ve sahiplerin (env) ek
 * kullanıcılara erişim vermesini/kaldırmasını sağlar. Testlerde sahte bir
 * uygulamayla değiştirilebilir.
 */
export interface AccessService {
  listMembers(): Promise<MemberInfo[]>;
  listAccess(): AccessView[];
  grant(userId: string, username: string, grantedBy: string): AccessResult;
  revoke(userId: string): AccessResult;
}

export function createAccessService(
  client: Client,
  guildId: string,
  ownerIds: string[],
): AccessService {
  const getGuild = () => client.guilds.cache.get(guildId);

  return {
    async listMembers() {
      const guild = getGuild();
      if (!guild) return [];
      // Üye listesi GuildMembers (privileged) intent'i gerektirir; kapalıysa
      // veya fetch başarısızsa panel çökmesin diye boş liste dön.
      let members;
      try {
        members = await guild.members.fetch();
      } catch {
        return [];
      }
      return [...members.values()]
        .filter((member) => !member.user.bot)
        .map((member) => ({
          id: member.id,
          username: member.user.username,
          displayName: member.displayName,
          avatarUrl: member.user.displayAvatarURL(),
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    },

    listAccess() {
      const guild = getGuild();
      const owners: AccessView[] = ownerIds.map((id) => ({
        userId: id,
        username: guild?.members.cache.get(id)?.user.username ?? id,
        isOwner: true,
        grantedBy: null,
        grantedAt: null,
      }));
      const granted: AccessView[] = dbListAccess()
        .filter((entry) => !ownerIds.includes(entry.userId))
        .map((entry) => ({
          userId: entry.userId,
          username: entry.username,
          isOwner: false,
          grantedBy: entry.grantedBy,
          grantedAt: entry.grantedAt,
        }));
      return [...owners, ...granted];
    },

    grant(userId, username, grantedBy) {
      if (ownerIds.includes(userId)) {
        return { ok: false, message: "Bu kullanıcı zaten sahip." };
      }
      grantAccess(userId, username, grantedBy);
      return { ok: true, message: "Erişim verildi." };
    },

    revoke(userId) {
      if (ownerIds.includes(userId)) {
        return { ok: false, message: "Sahibin erişimi kaldırılamaz." };
      }
      return revokeAccess(userId)
        ? { ok: true, message: "Erişim kaldırıldı." }
        : { ok: false, message: "Kullanıcı bulunamadı." };
    },
  };
}
