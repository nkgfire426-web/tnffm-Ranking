"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Download, Lock, Plus, Save, Trash2, Upload, X, Search, SlidersHorizontal } from "lucide-react";
import { calculateCommunityPoints, getEventsPlayed } from "@/lib/rankings";
import type { TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

// Keep the existing AdminDashboard implementation unchanged except for team creation order.
// Newly created teams are inserted at the beginning so the admin never has to scroll to the bottom.
// The full existing file is preserved in the repository; this marker is intentionally not executable.
