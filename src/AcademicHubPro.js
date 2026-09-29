import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Download, ExternalLink, FileArchive, FileText, Folder, FolderOpen, GraduationCap, Link, Search, ShieldCheck, Star, X, MessageCircle, CheckCircle } from 'lucide-react';
import { storage } from './firebase-client';