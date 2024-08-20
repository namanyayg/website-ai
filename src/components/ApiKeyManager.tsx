'use client'

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store"
import { toast } from 'sonner';

export default function ApiKeyManager() {
  const { openaiApiKey, setOpenaiApiKey } = useAppStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem("openaiApiKey");
    if (storedApiKey) {
      setOpenaiApiKey(storedApiKey);
    } else {
      setShowModal(true);
    }
  }, [setOpenaiApiKey]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenaiApiKey(e.target.value);
  };

  const saveApiKey = () => {
    localStorage.setItem("openaiApiKey", openaiApiKey);
    setShowModal(false);
    toast.success('API Key saved successfully!');
  };

  const editApiKey = () => {
    setShowModal(true);
  };

  if (!showModal && openaiApiKey) {
    return (
      <button
        onClick={editApiKey}
        className="text-xs text-gray-500 border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
      >
        Edit OpenAI API Key
      </button>
    );
  }

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Enter OpenAI API Key</h2>
        <label htmlFor="apiKey" className="block mb-2">OpenAI API Key:</label>
        <input
          type="text"
          id="apiKey"
          value={openaiApiKey}
          onChange={handleApiKeyChange}
          className="border border-gray-300 rounded px-2 py-1 w-full mb-4"
        />
        <button
          onClick={saveApiKey}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save Key
        </button>
      </div>
    </div>
  );
}