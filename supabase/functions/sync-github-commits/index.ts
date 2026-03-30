import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

interface SyncRequest {
  owner: string;
  repo: string;
  branch?: string;
  versionId?: string;
  since?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body
    const body: SyncRequest = await req.json();
    const { owner, repo, branch = "main", versionId, since } = body;

    if (!owner || !repo) {
      throw new Error("Missing required fields: owner and repo");
    }

    // Fetch commits from GitHub
    let githubUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=100`;
    if (since) {
      githubUrl += `&since=${since}`;
    }

    console.log("Fetching from GitHub:", githubUrl);

    const githubResponse = await fetch(githubUrl, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Supabase-Edge-Function",
      },
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      throw new Error(`GitHub API error: ${githubResponse.status} - ${errorText}`);
    }

    const commits: GitHubCommit[] = await githubResponse.json();

    console.log(`Fetched ${commits.length} commits from GitHub`);

    // Determine version ID
    let targetVersionId = versionId;

    if (!targetVersionId) {
      // Get or create current version
      const { data: currentVersion, error: versionError } = await supabase
        .from("versions")
        .select("id")
        .eq("is_current", true)
        .maybeSingle();

      if (versionError) throw versionError;

      if (currentVersion) {
        targetVersionId = currentVersion.id;
      } else {
        // Create a new version
        const { data: newVersion, error: createError } = await supabase
          .from("versions")
          .insert({
            version: "1.0.0",
            is_current: true,
            notes: "Synced from GitHub repository",
            created_by: "GitHub Sync",
          })
          .select("id")
          .single();

        if (createError) throw createError;
        targetVersionId = newVersion.id;
      }
    }

    // Parse and categorize commits
    const parsedCommits = commits.map((commit) => {
      const message = commit.commit.message;
      const lowerMessage = message.toLowerCase();

      let category = "feature";
      let title = message.split("\n")[0]; // First line is the title
      let description = message.split("\n").slice(1).join("\n").trim();

      // Categorize based on commit message
      if (lowerMessage.includes("fix") || lowerMessage.includes("bug")) {
        category = "bugfix";
      } else if (
        lowerMessage.includes("improve") ||
        lowerMessage.includes("enhance") ||
        lowerMessage.includes("update")
      ) {
        category = "enhancement";
      } else if (
        lowerMessage.includes("security") ||
        lowerMessage.includes("auth") ||
        lowerMessage.includes("permission")
      ) {
        category = "security";
      } else if (
        lowerMessage.includes("performance") ||
        lowerMessage.includes("optimize") ||
        lowerMessage.includes("speed")
      ) {
        category = "performance";
      } else if (
        lowerMessage.includes("doc") ||
        lowerMessage.includes("readme") ||
        lowerMessage.includes("comment")
      ) {
        category = "documentation";
      } else if (
        lowerMessage.includes("feat") ||
        lowerMessage.includes("add") ||
        lowerMessage.includes("new")
      ) {
        category = "feature";
      }

      return {
        version_id: targetVersionId,
        title: title.substring(0, 200), // Limit title length
        description: description.substring(0, 1000), // Limit description length
        author: commit.commit.author.name,
        commit_date: commit.commit.author.date,
        category,
      };
    });

    // Insert commits into database
    const { data: insertedCommits, error: insertError } = await supabase
      .from("version_commits")
      .upsert(parsedCommits, { onConflict: "id", ignoreDuplicates: false })
      .select();

    if (insertError) {
      console.error("Error inserting commits:", insertError);
      throw insertError;
    }

    console.log(`Successfully synced ${parsedCommits.length} commits`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${parsedCommits.length} commits from ${owner}/${repo}`,
        commits_synced: parsedCommits.length,
        version_id: targetVersionId,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in sync-github-commits:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
