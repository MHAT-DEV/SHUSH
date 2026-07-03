import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useRouteSync({
  activeTab,
  setActiveTab,
  activeCategory,
  setActiveCategory,
  activeChannel,
  setActiveChannel,
  user,
  couple,
  bffGroups,
  friends,
}: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const isSyncingFromUrl = useRef(false);

  // Parse URL to State
  useEffect(() => {
    if (!user) return; // Only sync when logged in
    
    const path = location.pathname;
    const parts = path.split("/").filter(Boolean);
    
    if (parts.length === 0) {
      // Home -> /chat
      isSyncingFromUrl.current = true;
      setActiveTab("chat");
      setActiveCategory("social");
      setActiveChannel(null);
      navigate("/chat", { replace: true });
      return;
    }

    const tab = parts[0];
    
    // Determine category based on tab
    let category = activeCategory;
    if (["chat", "space", "vault"].includes(tab)) category = "social";
    else if (tab === "discovery") category = "explore";
    else if (["pet", "store", "notifications", "lenses", "settings", "achievements"].includes(tab)) category = tab;
    
    isSyncingFromUrl.current = true;
    setActiveTab(tab as any);
    setActiveCategory(category as any);

    // Channel ID
    if (parts[1] && ["chat", "space", "vault"].includes(tab)) {
      const channelId = parts[1];

      // If activeChannel is already set to this channel, keep it!
      if (activeChannel && activeChannel.id === channelId) {
        isSyncingFromUrl.current = false;
        return;
      }

      let foundChannel = null;
      
      if (couple && channelId === "chat_" + couple.id) {
        foundChannel = { type: "COUPLE", id: channelId, name: "คู่รัก" };
      } else {
        const bff = bffGroups?.find((g: any) => "chat_" + g.id === channelId);
        if (bff) {
          foundChannel = { type: "BFF_GROUP", id: channelId, name: bff.name };
        } else if (channelId.startsWith("chat_")) {
          // Check if it is a friend DM chat ID (e.g. chat_user1_user2)
          const innerParts = channelId.substring(5).split("_");
          const friend = friends?.find((f: any) => innerParts.includes(f.id));
          if (friend) {
            foundChannel = {
              type: "FRIEND",
              id: channelId,
              friendId: friend.id,
              name: friend.displayName || friend.username,
            };
          }
        }
      }
      
      if (foundChannel) {
         if (activeChannel?.id !== foundChannel.id) {
            setActiveChannel(foundChannel);
         }
      } else {
         // Only reset active channel if we have actually loaded relationships / friends lists
         const hasLoadedData = (friends && friends.length > 0) || (bffGroups && bffGroups.length > 0) || couple;
         if (hasLoadedData) {
            setActiveChannel(null);
         }
      }
    } else {
      setActiveChannel(null);
    }
    
    // Give time for state to update before we allow state->URL sync
    setTimeout(() => {
      isSyncingFromUrl.current = false;
    }, 50);

  }, [location.pathname, user, couple, bffGroups, friends]);

  // Sync State to URL
  useEffect(() => {
    if (!user || isSyncingFromUrl.current) return;
    
    let newPath = `/${activeTab}`;
    if (["chat", "space", "vault"].includes(activeTab) && activeChannel) {
      newPath += `/${activeChannel.id}`;
    } else if (activeTab === "lenses" && location.pathname.startsWith("/lenses/")) {
      newPath = location.pathname; // Preserve target user ID
    }
    
    if (location.pathname !== newPath) {
      navigate(newPath);
    }
  }, [activeTab, activeChannel, user]);
}
