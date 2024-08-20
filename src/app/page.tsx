'use client'

import { useState } from "react";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";
import { toast } from "sonner";
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import ApiKeyManager from '@/components/ApiKeyManager';
import { useAppStore } from "@/lib/store";

const scaffoldGenerationPrompt = `You are an expert web designer and developer specializing in React and Tailwind CSS. Your task is to create a scaffold for a modern, responsive website based on the following project details:

[PROJECT_DETAILS]

Return a JSON object with the following structure:
{
  "name": "Project Name",
  "description": "Brief project description",
  "colorScheme": "Textual representation of the color scheme",
  "sections": [
    {
      "name": "Section Name",
      "prompt": "Detailed prompt for this section, describing what it should contain and how it should look. Do not suggest using any images."
    },
    ...
  ]
}

Ensure that the sections cover all necessary parts of a complete website based on the project details.`;

const sectionGenerationPrompt = `You are an expert web designer and developer specializing in React and Tailwind CSS. Your task is to create a modern, responsive website section based on the following details:

Project Name: [PROJECT_NAME]
Project Description: [PROJECT_DESCRIPTION]
Color Scheme: [COLOR_SCHEME]

Section Details:
[SECTION_PROMPT]

Your primary task is as a website designer, you must generate beautiful and modern JSX code with Tailwind CSS classes that implements this section. Include gradient fonts, backgrounds, and transitions where appropriate. You can use Font Awesome icons as well where needed.

Return only the JSX code for this section, without any description or comments.
The code should be clean, well-structured, and follow best practices.
Do NOT use any images in the project, unless specified by the user.
DO NOT include any explanations, comments, or full React components in your response, just the JSX for the section content.

Original Section Code:
[ORIGINAL_SECTION_CODE]

Old Instruction:
[OLD_INSTRUCTION]

Make only the necessary changes based on the differences between the old and new instructions. Avoid drastic changes unless explicitly required.`;

interface Section {
  name: string;
  prompt: string;
  isEdited?: boolean;
  code?: string;
  originalCode?: string;
  oldPrompt?: string;
}

interface Project {
  name: string;
  description: string;
  colorScheme: string;
  sections: Section[];
  originalDescription?: string;
}

export default function Webfast() {
  const [projectDetails, setProjectDetails] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'generating' | 'preview'>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sectionRegenerating, setSectionRegenerating] = useState<number | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isProjectEdited, setIsProjectEdited] = useState(false);

  const { openaiApiKey } = useAppStore();

  const openai = createOpenAI({
    apiKey: openaiApiKey,
    compatibility: 'strict',
  });

  const handleDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProjectDetails(e.target.value);
  };

  const generateWebsite = async () => {
    setCurrentStep('generating');
    setIsGenerating(true);
    try {
      const scaffoldResponse = await generateText({
        model: openai('gpt-4'),
        prompt: scaffoldGenerationPrompt.replace("[PROJECT_DETAILS]", projectDetails),
      });
      const scaffold = JSON.parse(scaffoldResponse.text) as Project;
      setProject({ ...scaffold, originalDescription: scaffold.description });

      const sectionPromises = scaffold.sections.map((section, index) =>
        generateSection(scaffold, section, index)
      );

      await Promise.all(sectionPromises);

      setCurrentStep('preview');
      setIsGenerating(false);
      setIsProjectEdited(false);
    } catch (error) {
      console.error("Error generating website:", error);
      toast.error("Failed to generate website. Please try again.");
      setIsGenerating(false);
    }
  };

  const generateSection = async (project: Project, section: Section, index: number) => {
    try {
      const sectionPrompt = sectionGenerationPrompt
        .replace("[PROJECT_NAME]", project.name)
        .replace("[PROJECT_DESCRIPTION]", project.description)
        .replace("[COLOR_SCHEME]", project.colorScheme)
        .replace("[SECTION_PROMPT]", section.prompt)
        .replace("[ORIGINAL_SECTION_CODE]", section.originalCode || "")
        .replace("[OLD_INSTRUCTION]", section.oldPrompt || "");
      const result = await generateText({
        model: openai('gpt-4o'),
        prompt: sectionPrompt,
      });

      setProject(prev => {
        if (!prev) return null;
        const newSections = [...prev.sections];
        newSections[index] = {
          ...newSections[index],
          code: result.text.replace(/```(?:jsx)?\n([\s\S]*?)\n```/g, '$1').trim(),
          originalCode: newSections[index].originalCode || result.text.replace(/```(?:jsx)?\n([\s\S]*?)\n```/g, '$1').trim(),
          oldPrompt: newSections[index].prompt
        };
        return { ...prev, sections: newSections };
      });
    } catch (error) {
      console.error(`Error generating section ${section.name}:`, error);
      toast.error(`Failed to generate section ${section.name}.`);
    }
  };

  const handleProjectChange = (field: keyof Project, value: string) => {
    if (project) {
      setProject((prev: Project | null) => {
        const updatedProject = { ...prev!, [field]: value };
        setIsProjectEdited(true);
        return updatedProject;
      });
    }
  };

  const regenerateAllSections = async () => {
    if (!project) return;
    setIsGenerating(true);
    const sectionPromises = project.sections.map((section, index) =>
      generateSection(project, section, index)
    );
    await Promise.all(sectionPromises);
    setIsGenerating(false);
    setIsProjectEdited(false);
  };

  const handleSectionChange = (index: number, field: keyof Section, value: string) => {
    if (project) {
      setProject((prev: Project | null) => {
        if (!prev) return null;
        const newSections = [...prev.sections];
        newSections[index] = {
          ...newSections[index],
          [field]: value,
          isEdited: true,
          oldPrompt: field === 'prompt' ? newSections[index].prompt : newSections[index].oldPrompt
        };
        return { ...prev, sections: newSections };
      });
    }
  };

  const deleteSection = (index: number) => {
    if (project) {
      setProject((prev: Project | null) => ({
        ...prev!,
        sections: prev!.sections.filter((_, i) => i !== index)
      }));
    }
  };

  const regenerateSection = async (index: number) => {
    if (!project) return;
    setSectionRegenerating(index);
    await generateSection(project, project.sections[index], index);
    setSectionRegenerating(null);
  };

  const getCombinedCode = () => {
    if (!project) return "";
    return `<div>\n\n${project.sections.map(section => section.code || "").join("\n\n")}\n\n</div>`;
  };

  return (
    <main className="flex">
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-1/4' : 'w-0'} overflow-hidden border-r-2 border-gray-300 fixed top-0 left-0 h-full flex flex-col`}>
        <div className="flex-grow overflow-y-auto p-4 text-sm">
          {currentStep === 'input' && (
            <div className="mb-4">
              <label htmlFor="projectDetails" className="block mb-2 font-bold">
                Project Details:
              </label>
              <textarea
                id="projectDetails"
                value={projectDetails}
                onChange={handleDetailsChange}
                className="w-full h-32 p-2 border border-gray-300 rounded"
                placeholder="Describe your website project..."
              />
              <button
                onClick={generateWebsite}
                className="w-full mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={isGenerating}
              >
                <i className="fa fa-magic mr-2"></i>
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          )}
          {isGenerating && currentStep === 'generating' && (
            <div className="mt-4 flex flex-col items-center justify-center">
              <div className="mb-8 animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              <p>Generating Website...</p>
            </div>
          )}
          {project && currentStep === 'preview' && (
            <div className="mb-4">
              <div className="mb-2">
                <strong>Project Name:</strong>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => handleProjectChange('name', e.target.value)}
                  className="w-full border-b border-gray-200 my-2 py-2"
                />
              </div>
              <div className="mb-2">
                <strong>Description:</strong>
                <textarea
                  value={project.description}
                  onChange={(e) => handleProjectChange('description', e.target.value)}
                  className="w-full mt-1 border-b border-gray-200 my-2 py-2 resize-none"
                  rows={3}
                />
              </div>
              <div className="mb-2">
                <strong>Color Scheme:</strong>
                <textarea
                  value={project.colorScheme}
                  onChange={(e) => handleProjectChange('colorScheme', e.target.value)}
                  className="w-full border-b border-gray-200 my-2 py-2 resize-none"
                  rows={3}
                />
              </div>
              {isProjectEdited && (
                <button
                  onClick={regenerateAllSections}
                  className="w-full mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                  disabled={isGenerating}
                >
                  <i className="fa fa-refresh mr-2"></i>
                  {isGenerating ? 'Regenerating...' : 'Regenerate Website'}
                </button>
              )}
              <h3 className="text-xl font-semibold mt-6 mb-4">Sections:</h3>
              {project.sections.map((section, index) => (
                <div key={index} className="mb-6">
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) => handleSectionChange(index, 'name', e.target.value)}
                    className="w-full font-bold border-b border-gray-200 my-2 py-1"
                  />
                  <textarea
                    value={section.prompt}
                    onChange={(e) => handleSectionChange(index, 'prompt', e.target.value)}
                    className="w-full mt-1 border-b border-gray-200 my-2 py-1 resize-none"
                    rows={8}
                  />
                  <div className="flex justify-between mt-2">
                    <button
                      onClick={() => deleteSection(index)}
                      className="text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-100 px-2 py-1"
                    >
                      <i className="fa fa-trash mr-2"></i>Delete Section
                    </button>
                    {section.isEdited && (
                      <button
                        onClick={() => regenerateSection(index)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                        disabled={sectionRegenerating === index}
                      >
                        <i className="fa fa-refresh mr-1"></i>
                        {sectionRegenerating === index ? 'Updating...' : 'Update Section'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 flex justify-center">
            <ApiKeyManager />
          </div>
        </div>
      </div>
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-3/4' : 'w-full'} pl-4`} style={{ marginLeft: isSidebarOpen ? '25%' : '0%' }}>
        {currentStep === 'preview' && project && (
          <div>
            <LiveProvider code={getCombinedCode()}>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div>
                    <LivePreview />
                  </div>
                </div>
                <div>
                  <LiveEditor
                    className="rounded text-sm font-mono overflow-x-auto"
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word'
                    }}
                    disabled={!isEditorFocused}
                    onFocus={() => setIsEditorFocused(true)}
                    onBlur={() => setIsEditorFocused(false)}
                  />
                  <LiveError />
                </div>
              </div>
            </LiveProvider>
          </div>
        )}
      </div>
    </main>
  );
}
