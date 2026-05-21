import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../context/GameContext";
import { TbBolt, TbWind, TbDroplet, TbLeaf, TbFilter, TbAlertTriangle, TbLock } from 'react-icons/tb';
import ProjectCardSkeleton from "../components/ProjectCardSkeleton";
import Tooltip from "../components/Tooltip";
import { shopItems, ShopItem, ItemCategory, ItemRarity } from "../types/Shop";

const rarityColors: Record<ItemRarity, string> = {
  Common: "border-gray-500/30 text-gray-300 bg-white/5 hover:bg-white/10",
  Rare: "border-blue-500/50 text-blue-200 bg-blue-900/20 hover:bg-blue-800/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
  Epic: "border-purple-500/60 text-purple-200 bg-purple-900/20 hover:bg-purple-800/30 shadow-[0_0_20px_rgba(168,85,247,0.25)]",
  Legendary: "border-yellow-500/80 text-yellow-200 bg-yellow-900/20 hover:bg-yellow-800/30 shadow-[0_0_30px_rgba(234,179,8,0.4)]",
};

const categoryLabels: Record<'All' | ItemCategory, string> = {
  All: "All Items",
  trees_plants: "Trees & Plants",
  renewable_energy: "Energy",
  eco_buildings: "Buildings",
  decorations: "Decorations",
  community: "Community",
};

const EcoVillage = () => {
  const { state, dispatch } = useGame();
  const { user, ecoVillage, notifications } = state;
  
  const [isLoading, setIsLoading] = useState(true);
  const [popup, setPopup] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showNotifications, setShowNotifications] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'All' | ItemCategory>('All');
  
  // Confetti/Animation state
  const [purchaseEffects, setPurchaseEffects] = useState<{id: number, x: number, y: number}[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      setShowNotifications(true);
    }
  }, [notifications]);

  const buyItem = (item: ShopItem, event: React.MouseEvent) => {
    // Check requirements
    if (item.unlockRequirements) {
      const { airQuality = 0, waterQuality = 0, biodiversity = 0 } = item.unlockRequirements;
      if (
        (ecoVillage.airQuality || 0) < airQuality ||
        (ecoVillage.waterQuality || 0) < waterQuality ||
        (ecoVillage.biodiversity || 0) < biodiversity
      ) {
        setPopup({ message: "Village milestones not met!", type: 'error' });
        setTimeout(() => setPopup(null), 1500);
        return;
      }
    }

    if (user.points < item.cost) {
      setPopup({ message: "Not enough points!", type: 'error' });
      setTimeout(() => setPopup(null), 1500);
      return;
    }

    dispatch({ type: 'ADD_POINTS', payload: -item.cost });
    
    const updates: Partial<typeof ecoVillage> = {
      inventory: [...(ecoVillage.inventory || []), item.emoji],
    };

    if (item.impactScores) {
      if (item.impactScores.air) updates.airQuality = Math.min(100, (ecoVillage.airQuality || 0) + item.impactScores.air);
      if (item.impactScores.water) updates.waterQuality = Math.min(100, (ecoVillage.waterQuality || 0) + item.impactScores.water);
      if (item.impactScores.bio) updates.biodiversity = Math.min(100, (ecoVillage.biodiversity || 0) + item.impactScores.bio);
      
      if (item.id === 'water_filter') updates.filterHealth = 100;
    }

    dispatch({ type: 'UPDATE_ECO_VILLAGE', payload: updates });
    setPopup({ message: `You bought ${item.label}!`, type: 'success' });
    setTimeout(() => setPopup(null), 1500);

    // Trigger purchase effect
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const newEffect = { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top };
    setPurchaseEffects(prev => [...prev, newEffect]);
    setTimeout(() => {
      setPurchaseEffects(prev => prev.filter(e => e.id !== newEffect.id));
    }, 1000);
  };

  const handleDragStart = (emoji: string) => {
    setDraggedItem(emoji);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedItem) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newLandscape = [...(ecoVillage.landscape || []), { emoji: draggedItem, x, y }];
    const newInventory = [...(ecoVillage.inventory || [])];
    const itemIndex = newInventory.indexOf(draggedItem);
    if (itemIndex > -1) {
      newInventory.splice(itemIndex, 1);
    }

    dispatch({ type: 'UPDATE_ECO_VILLAGE', payload: {
      landscape: newLandscape,
      inventory: newInventory
    }});
    
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const filteredItems = activeCategory === 'All' 
    ? shopItems 
    : shopItems.filter(item => item.category === activeCategory);

  return (
    <div className="p-4 md:p-8 text-white max-w-7xl mx-auto">
      {/* Purchase Effects */}
      {purchaseEffects.map(effect => (
        <motion.div
          key={effect.id}
          initial={{ opacity: 1, y: effect.y, x: effect.x, scale: 0.5 }}
          animate={{ opacity: 0, y: effect.y - 100, scale: 2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="fixed pointer-events-none z-50 text-4xl text-yellow-300"
        >
          ✨
        </motion.div>
      ))}

      <AnimatePresence>
        {showNotifications && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-4 shadow-2xl max-w-lg w-full border border-white/30"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TbAlertTriangle className="h-5 w-5" />
                Village Update
              </h3>
              <button
                onClick={() => {
                  setShowNotifications(false);
                  dispatch({ type: 'CLEAR_NOTIFICATIONS' });
                }}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-sm">
              {notifications.map((n, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-4xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-emerald-500">
          🌳 Your Eco Village
        </h1>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-2 shadow-inner">
          <TbBolt className="text-yellow-400 h-6 w-6" />
          <span className="text-2xl font-bold">{user.points} <span className="text-sm font-normal text-gray-300">pts</span></span>
        </div>
      </div>

      {/* Resource Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/10 animate-pulse" />
          ))
        ) : (
          <>
            <Tooltip content="Village air health. Improved by planting trees and adding solar panels.">
              <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-4 border border-sky-500/20 text-center flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                  <TbWind className="h-6 w-6 text-sky-300" />
                </div>
                <div className="text-2xl font-bold text-white">{ecoVillage.airQuality}%</div>
                <div className="text-sm text-sky-200 font-medium tracking-wide uppercase">Air Quality</div>
              </div>
            </Tooltip>
            <Tooltip content="Water cleanliness. Improved by water filters; degraded by wildlife pollution.">
              <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-4 border border-cyan-500/20 text-center flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <TbDroplet className="h-6 w-6 text-cyan-300" />
                </div>
                <div className="text-2xl font-bold text-white">{ecoVillage.waterQuality}%</div>
                <div className="text-sm text-cyan-200 font-medium tracking-wide uppercase">Water Purity</div>
              </div>
            </Tooltip>
            <Tooltip content="Biodiversity level. Improved by planting trees, gardens, and adding birds/wildlife.">
              <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-4 border border-green-500/20 text-center flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <TbLeaf className="h-6 w-6 text-green-300" />
                </div>
                <div className="text-2xl font-bold text-white">{ecoVillage.biodiversity}%</div>
                <div className="text-sm text-green-200 font-medium tracking-wide uppercase">Biodiversity</div>
              </div>
            </Tooltip>
            <Tooltip content="Status of water filters. Degrades over time; buy new filters to restore water quality.">
              <div className={`bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-4 border ${ecoVillage.filterHealth < 30 ? 'border-red-500/40' : 'border-indigo-500/20'} text-center flex flex-col items-center justify-center hover:bg-white/10 transition-colors`}>
                <div className={`w-12 h-12 rounded-full ${ecoVillage.filterHealth < 30 ? 'bg-red-500/20 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-indigo-500/20 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]'} flex items-center justify-center mb-2`}>
                  <TbFilter className={`h-6 w-6 ${ecoVillage.filterHealth < 30 ? 'text-red-300' : 'text-indigo-300'}`} />
                </div>
                <div className="text-2xl font-bold text-white">{ecoVillage.filterHealth}%</div>
                <div className="text-sm text-indigo-200 font-medium tracking-wide uppercase">Filter Health</div>
              </div>
            </Tooltip>
          </>
        )}
      </div>

      {/* LANDSCAPE */}
      <div 
        className="mb-10 relative shadow-2xl rounded-3xl overflow-hidden min-h-[500px] border-[3px] border-emerald-900/40 group bg-[#4a7c59]"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {isLoading ? (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        ) : (
          <>
            <div
              className="absolute inset-0 z-0 pointer-events-none transition-transform duration-[20s] ease-linear group-hover:scale-105"
              style={{
                backgroundImage: "url('/villageback.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center 70%",
                filter: "brightness(0.85) contrast(1.1)",
              }}
            />
            
            {/* Animated Clouds */}
            <motion.div 
              animate={{ x: [-100, window.innerWidth], opacity: [0, 0.8, 0] }} 
              transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
              className="absolute top-10 text-6xl z-5 pointer-events-none"
            >☁️</motion.div>
            <motion.div 
              animate={{ x: [window.innerWidth, -100], opacity: [0, 0.6, 0] }} 
              transition={{ repeat: Infinity, duration: 35, ease: "linear", delay: 15 }}
              className="absolute top-24 text-5xl z-5 pointer-events-none"
            >☁️</motion.div>

            <div className="relative z-20 w-full h-full">
              {(ecoVillage.landscape || []).map((item, index) => (
                <motion.div
                  key={`${index}-${item.emoji}`}
                  initial={{ scale: 0, rotate: -30, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="text-6xl absolute cursor-pointer hover:scale-110 transition-transform filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                  style={{
                    left: `calc(${item.x}% - 30px)`,
                    top: `calc(${item.y}% - 30px)`,
                  }}
                  title="A placed item"
                >
                  {item.emoji}
                </motion.div>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 z-30 pointer-events-none bg-gradient-to-t from-black/60 to-transparent flex items-end justify-around text-4xl pb-4">
              <span>🌿</span><span>🌾</span><span>🌱</span><span>🌿</span><span>🌾</span><span>🌱</span><span>🌿</span>
            </div>
            
            {/* Drop overlay hint */}
            <div className="absolute inset-0 z-40 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-4 border-dashed border-white/20 rounded-3xl m-4 flex items-center justify-center">
              <span className="text-white/30 text-2xl font-bold bg-black/20 px-6 py-3 rounded-full backdrop-blur-sm">
                Drop items here
              </span>
            </div>
          </>
        )}
      </div>

      {/* INVENTORY */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>📦</span> Inventory <span className="text-sm font-normal text-gray-400">(Drag into the village to place)</span>
        </h2>
        <div className="flex gap-4 flex-wrap min-h-[100px] bg-white/5 rounded-2xl p-6 border border-white/10 shadow-inner">
          {isLoading ? (
            <div className="h-16 bg-white/10 rounded-xl w-48 animate-pulse" />
          ) : (ecoVillage.inventory || []).length === 0 ? (
            <div className="w-full text-center text-gray-400 py-4 flex flex-col items-center">
              <span className="text-4xl mb-2 opacity-50">🛒</span>
              <p>Your inventory is empty. Buy items from the shop below!</p>
            </div>
          ) : (
            <AnimatePresence>
              {(ecoVillage.inventory || []).map((emoji, i) => (
                <motion.div
                  key={`${i}-${emoji}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  draggable
                  onDragStart={() => handleDragStart(emoji)}
                  className="text-5xl p-4 bg-gradient-to-br from-white/10 to-transparent border border-white/20 rounded-2xl hover:bg-white/20 hover:scale-110 hover:-translate-y-2 transition-all cursor-grab active:cursor-grabbing shadow-lg"
                >
                  {emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* SHOP */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <span>🛒</span> Village Shop
        </h2>
        
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key as any)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeCategory === key
                  ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-[300px] mb-20">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <ProjectCardSkeleton key={idx} />
            ))
          ) : (
            filteredItems.map((item) => {
              const canAfford = user.points >= item.cost;
              let requirementsMet = true;
              let missingReqs = [];
              
              if (item.unlockRequirements) {
                const { airQuality = 0, waterQuality = 0, biodiversity = 0 } = item.unlockRequirements;
                if ((ecoVillage.airQuality || 0) < airQuality) { requirementsMet = false; missingReqs.push(`Air: ${airQuality}%`); }
                if ((ecoVillage.waterQuality || 0) < waterQuality) { requirementsMet = false; missingReqs.push(`Water: ${waterQuality}%`); }
                if ((ecoVillage.biodiversity || 0) < biodiversity) { requirementsMet = false; missingReqs.push(`Bio: ${biodiversity}%`); }
              }

              const isLocked = !requirementsMet;
              const rarityStyle = rarityColors[item.rarity];

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`relative flex flex-col bg-gradient-to-b from-white/10 to-black/40 backdrop-blur-md rounded-2xl border-2 p-5 transition-all overflow-hidden ${rarityStyle} ${
                    isLocked ? 'opacity-70 grayscale-[50%]' : canAfford ? 'hover:-translate-y-2 cursor-pointer' : 'opacity-80'
                  }`}
                  onClick={(e) => !isLocked && buyItem(item, e)}
                >
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center text-white/90 cursor-not-allowed">
                      <TbLock className="h-10 w-10 mb-2 text-red-400" />
                      <span className="font-bold mb-1">Locked</span>
                      <span className="text-xs text-gray-300">Requires: {missingReqs.join(', ')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-1 bg-black/40 rounded text-[10px] font-bold uppercase tracking-wider">
                      {item.rarity}
                    </span>
                    <span className={`font-bold px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                      canAfford ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      <TbBolt /> {item.cost}
                    </span>
                  </div>

                  <div className="text-7xl self-center my-4 drop-shadow-lg filter">{item.emoji}</div>
                  
                  <div className="mt-auto">
                    <h3 className="font-bold text-lg mb-1">{item.label}</h3>
                    <p className="text-xs text-gray-400 mb-3 line-clamp-2">{item.description}</p>
                    
                    {/* Impacts */}
                    <div className="flex gap-2 flex-wrap text-xs font-medium">
                      {item.impactScores?.air && (
                        <span className="bg-sky-500/20 text-sky-200 px-2 py-1 rounded flex items-center gap-1">
                          <TbWind /> +{item.impactScores.air}
                        </span>
                      )}
                      {item.impactScores?.water && (
                        <span className="bg-cyan-500/20 text-cyan-200 px-2 py-1 rounded flex items-center gap-1">
                          <TbDroplet /> +{item.impactScores.water}
                        </span>
                      )}
                      {item.impactScores?.bio && (
                        <span className="bg-green-500/20 text-green-200 px-2 py-1 rounded flex items-center gap-1">
                          <TbLeaf /> +{item.impactScores.bio}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
      
      {/* POPUP */}
      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-black/90 px-8 py-4 rounded-2xl text-white text-lg font-bold border flex items-center gap-3 ${
              popup.type === 'error' 
                ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
                : 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]'
            }`}
          >
            <span>{popup.type === 'error' ? '❌' : '✅'}</span> {popup.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EcoVillage;