using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public sealed class AppContainerRunResult
{
    public int ProcessId { get; set; }
    public uint ExitCode { get; set; }
    public bool TimedOut { get; set; }
    public bool IsAppContainer { get; set; }
    public string IntegrityLevelSid { get; set; }
    public uint IntegrityLevelRid { get; set; }
    public bool IsLowIntegrity { get { return IntegrityLevelRid <= 4096; } }
}

public static class AppContainerLauncher
{
    private const uint CREATE_SUSPENDED = 0x00000004;
    private const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
    private const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
    private const int PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES = 0x00020009;
    private const int JobObjectExtendedLimitInformation = 9;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const uint WAIT_OBJECT_0 = 0;
    private const uint WAIT_TIMEOUT = 0x00000102;
    private const uint WAIT_FAILED = 0xffffffff;

    [StructLayout(LayoutKind.Sequential)]
    private struct SECURITY_CAPABILITIES
    {
        public IntPtr AppContainerSid;
        public IntPtr Capabilities;
        public uint CapabilityCount;
        public uint Reserved;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public uint cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public uint dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
        public ushort wShowWindow, cbReserved2;
        public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFOEX
    {
        public STARTUPINFO StartupInfo;
        public IntPtr lpAttributeList;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION
    {
        public IntPtr hProcess, hThread;
        public uint dwProcessId, dwThreadId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit, PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass, SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount;
        public ulong ReadTransferCount, WriteTransferCount, OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
    }

    [DllImport("userenv.dll", CharSet = CharSet.Unicode)]
    private static extern int CreateAppContainerProfile(string name, string displayName, string description, IntPtr capabilities, uint capabilityCount, out IntPtr sid);
    [DllImport("userenv.dll", CharSet = CharSet.Unicode)]
    private static extern int DeleteAppContainerProfile(string name);
    [DllImport("userenv.dll", CharSet = CharSet.Unicode)]
    private static extern int GetAppContainerFolderPath(string sid, out IntPtr path);
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern IntPtr FreeSid(IntPtr sid);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint length);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateJobObject(IntPtr job, uint exitCode);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute, IntPtr value, IntPtr size, IntPtr previous, IntPtr returnedSize);
    [DllImport("kernel32.dll")]
    private static extern void DeleteProcThreadAttributeList(IntPtr list);
    [DllImport("kernel32.dll", EntryPoint = "CreateProcessW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcess(string applicationName, StringBuilder commandLine, IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint flags, IntPtr environment, string currentDirectory, ref STARTUPINFOEX startup, out PROCESS_INFORMATION processInfo);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateProcess(IntPtr process, uint exitCode);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool GetTokenInformation(IntPtr token, int infoClass, out int value, int length, out int returnLength);
    [DllImport("advapi32.dll", EntryPoint = "GetTokenInformation", SetLastError = true)]
    private static extern bool GetTokenInformationBuffer(IntPtr token, int infoClass, IntPtr buffer, int length, out int returnLength);

    public static IntPtr CreateProfile(string name)
    {
        IntPtr sid;
        int hr = CreateAppContainerProfile(name, "Agent Canary M2 test sandbox", "Disposable execution-isolation test profile", IntPtr.Zero, 0, out sid);
        if (hr < 0) Marshal.ThrowExceptionForHR(hr);
        return sid;
    }

    public static string GetDataPath(IntPtr sid)
    {
        IntPtr path;
        int hr = GetAppContainerFolderPath(new System.Security.Principal.SecurityIdentifier(sid).Value, out path);
        if (hr < 0) Marshal.ThrowExceptionForHR(hr);
        try { return Marshal.PtrToStringUni(path); }
        finally { Marshal.FreeCoTaskMem(path); }
    }

    public static int DeleteProfile(string name) { return DeleteAppContainerProfile(name); }
    public static void ReleaseSid(IntPtr sid) { if (sid != IntPtr.Zero) FreeSid(sid); }
    public static string SidToString(IntPtr sid) { return new System.Security.Principal.SecurityIdentifier(sid).Value; }

    private static string ReadIntegrityLevelSid(IntPtr token)
    {
        int needed;
        GetTokenInformationBuffer(token, 25, IntPtr.Zero, 0, out needed);
        if (needed <= 0) ThrowLastError("GetTokenInformation(TokenIntegrityLevel size)");
        IntPtr buffer = Marshal.AllocHGlobal(needed);
        try
        {
            int returned;
            if (!GetTokenInformationBuffer(token, 25, buffer, needed, out returned))
                ThrowLastError("GetTokenInformation(TokenIntegrityLevel)");
            IntPtr sid = Marshal.ReadIntPtr(buffer);
            return new System.Security.Principal.SecurityIdentifier(sid).Value;
        }
        finally { Marshal.FreeHGlobal(buffer); }
    }

    public static AppContainerRunResult RunJobBaseline(string executable, string[] arguments, string cwd, string[] environment, int timeoutMilliseconds)
    {
        if (String.IsNullOrWhiteSpace(executable) || !System.IO.Path.IsPathRooted(executable)) throw new ArgumentException("Executable must be an absolute path.");
        if (!System.IO.Directory.Exists(cwd)) throw new ArgumentException("Working directory must already exist.");
        if (timeoutMilliseconds < 1) throw new ArgumentOutOfRangeException("timeoutMilliseconds");

        IntPtr job = IntPtr.Zero, envPtr = IntPtr.Zero;
        PROCESS_INFORMATION pi = new PROCESS_INFORMATION();
        try
        {
            job = CreateJobObject(IntPtr.Zero, null);
            if (job == IntPtr.Zero) ThrowLastError("CreateJobObject(baseline)");
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, ref limits, (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION))))
                ThrowLastError("SetInformationJobObject(baseline)");

            if (environment != null)
                envPtr = Marshal.StringToHGlobalUni(String.Join("\0", environment) + "\0");
            STARTUPINFOEX startup = new STARTUPINFOEX();
            startup.StartupInfo.cb = (uint)Marshal.SizeOf(typeof(STARTUPINFO));
            StringBuilder commandLine = new StringBuilder(BuildCommandLine(executable, arguments));
            uint flags = CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT;
            if (!CreateProcess(executable, commandLine, IntPtr.Zero, IntPtr.Zero, false, flags, envPtr, cwd, ref startup, out pi))
                ThrowLastError("CreateProcess(baseline)");

            if (!AssignProcessToJobObject(job, pi.hProcess))
            {
                TerminateProcess(pi.hProcess, 125);
                WaitForSingleObject(pi.hProcess, 5000);
                ThrowLastError("AssignProcessToJobObject(baseline)");
            }
            if (ResumeThread(pi.hThread) == WAIT_FAILED)
            {
                TerminateJobObject(job, 125);
                ThrowLastError("ResumeThread(baseline)");
            }

            uint wait = WaitForSingleObject(pi.hProcess, (uint)timeoutMilliseconds);
            AppContainerRunResult result = new AppContainerRunResult();
            result.ProcessId = unchecked((int)pi.dwProcessId);
            if (wait == WAIT_TIMEOUT)
            {
                result.TimedOut = true;
                result.ExitCode = 124;
                if (!TerminateJobObject(job, result.ExitCode)) ThrowLastError("TerminateJobObject(baseline timeout)");
                WaitForSingleObject(pi.hProcess, 5000);
            }
            else if (wait == WAIT_OBJECT_0)
            {
                uint childExitCode;
                if (!GetExitCodeProcess(pi.hProcess, out childExitCode)) ThrowLastError("GetExitCodeProcess(baseline)");
                result.ExitCode = childExitCode;
            }
            else
            {
                ThrowLastError("WaitForSingleObject(baseline)");
            }
            return result;
        }
        finally
        {
            if (pi.hThread != IntPtr.Zero) CloseHandle(pi.hThread);
            if (pi.hProcess != IntPtr.Zero) CloseHandle(pi.hProcess);
            if (job != IntPtr.Zero) CloseHandle(job);
            if (envPtr != IntPtr.Zero) Marshal.FreeHGlobal(envPtr);
        }
    }

    public static AppContainerRunResult Run(IntPtr sid, string executable, string[] arguments, string cwd, string[] environment, int timeoutMilliseconds)
    {
        if (sid == IntPtr.Zero) throw new ArgumentException("A valid AppContainer SID is required.");
        if (String.IsNullOrWhiteSpace(executable) || !System.IO.Path.IsPathRooted(executable)) throw new ArgumentException("Executable must be an absolute path.");
        if (!System.IO.Directory.Exists(cwd)) throw new ArgumentException("Working directory must already exist.");
        if (timeoutMilliseconds < 1) throw new ArgumentOutOfRangeException("timeoutMilliseconds");

        IntPtr job = IntPtr.Zero, attributes = IntPtr.Zero, capsPtr = IntPtr.Zero, envPtr = IntPtr.Zero;
        PROCESS_INFORMATION pi = new PROCESS_INFORMATION();
        bool attributesInitialized = false;
        try
        {
            job = CreateJobObject(IntPtr.Zero, null);
            if (job == IntPtr.Zero) ThrowLastError("CreateJobObject");
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, ref limits, (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION))))
                ThrowLastError("SetInformationJobObject");

            IntPtr size = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
            if (size == IntPtr.Zero) ThrowLastError("InitializeProcThreadAttributeList(size)");
            attributes = Marshal.AllocHGlobal(size);
            if (!InitializeProcThreadAttributeList(attributes, 1, 0, ref size)) ThrowLastError("InitializeProcThreadAttributeList");
            attributesInitialized = true;

            SECURITY_CAPABILITIES caps = new SECURITY_CAPABILITIES();
            caps.AppContainerSid = sid;
            capsPtr = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(SECURITY_CAPABILITIES)));
            Marshal.StructureToPtr(caps, capsPtr, false);
            if (!UpdateProcThreadAttribute(attributes, 0, new IntPtr(PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES), capsPtr, new IntPtr(Marshal.SizeOf(typeof(SECURITY_CAPABILITIES))), IntPtr.Zero, IntPtr.Zero))
                ThrowLastError("UpdateProcThreadAttribute(SECURITY_CAPABILITIES)");

            if (environment != null)
                envPtr = Marshal.StringToHGlobalUni(String.Join("\0", environment) + "\0");
            STARTUPINFOEX startup = new STARTUPINFOEX();
            startup.StartupInfo.cb = (uint)Marshal.SizeOf(typeof(STARTUPINFOEX));
            startup.lpAttributeList = attributes;
            StringBuilder commandLine = new StringBuilder(BuildCommandLine(executable, arguments));
            uint flags = CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | EXTENDED_STARTUPINFO_PRESENT;
            if (!CreateProcess(executable, commandLine, IntPtr.Zero, IntPtr.Zero, false, flags, envPtr, cwd, ref startup, out pi))
                ThrowLastError("CreateProcess(AppContainer)");

            if (!AssignProcessToJobObject(job, pi.hProcess))
            {
                TerminateProcess(pi.hProcess, 125);
                WaitForSingleObject(pi.hProcess, 5000);
                ThrowLastError("AssignProcessToJobObject");
            }
            bool isAppContainer;
            string integrityLevelSid;
            IntPtr token;
            if (!OpenProcessToken(pi.hProcess, 0x0008, out token)) ThrowLastError("OpenProcessToken");
            try
            {
                int tokenValue, returned;
                if (!GetTokenInformation(token, 29, out tokenValue, sizeof(int), out returned)) ThrowLastError("GetTokenInformation(TokenIsAppContainer)");
                isAppContainer = tokenValue != 0;
                integrityLevelSid = ReadIntegrityLevelSid(token);
            }
            finally { CloseHandle(token); }
            if (ResumeThread(pi.hThread) == WAIT_FAILED)
            {
                TerminateJobObject(job, 125);
                ThrowLastError("ResumeThread");
            }

            uint wait = WaitForSingleObject(pi.hProcess, (uint)timeoutMilliseconds);
            AppContainerRunResult result = new AppContainerRunResult();
            result.ProcessId = unchecked((int)pi.dwProcessId);
            result.IsAppContainer = isAppContainer;
            result.IntegrityLevelSid = integrityLevelSid;
            string[] integrityParts = integrityLevelSid.Split('-');
            result.IntegrityLevelRid = UInt32.Parse(integrityParts[integrityParts.Length - 1], System.Globalization.CultureInfo.InvariantCulture);
            if (wait == WAIT_TIMEOUT)
            {
                result.TimedOut = true;
                result.ExitCode = 124;
                if (!TerminateJobObject(job, result.ExitCode)) ThrowLastError("TerminateJobObject(timeout)");
                WaitForSingleObject(pi.hProcess, 5000);
            }
            else if (wait == WAIT_OBJECT_0)
            {
                uint childExitCode;
                if (!GetExitCodeProcess(pi.hProcess, out childExitCode)) ThrowLastError("GetExitCodeProcess");
                result.ExitCode = childExitCode;
            }
            else
            {
                ThrowLastError("WaitForSingleObject");
            }
            return result;
        }
        finally
        {
            if (pi.hThread != IntPtr.Zero) CloseHandle(pi.hThread);
            if (pi.hProcess != IntPtr.Zero) CloseHandle(pi.hProcess);
            // Closing the last handle terminates any remaining descendants in the job.
            if (job != IntPtr.Zero) CloseHandle(job);
            if (attributesInitialized) DeleteProcThreadAttributeList(attributes);
            if (attributes != IntPtr.Zero) Marshal.FreeHGlobal(attributes);
            if (capsPtr != IntPtr.Zero) Marshal.FreeHGlobal(capsPtr);
            if (envPtr != IntPtr.Zero) Marshal.FreeHGlobal(envPtr);
        }
    }

    private static string BuildCommandLine(string executable, string[] arguments)
    {
        StringBuilder command = new StringBuilder(Quote(executable));
        if (arguments != null) foreach (string arg in arguments) { command.Append(' '); command.Append(Quote(arg ?? String.Empty)); }
        return command.ToString();
    }

    private static string Quote(string value)
    {
        const char backslash = (char)92;
        StringBuilder result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in value)
        {
            if (c == backslash) slashes++;
            else if (c == '"') { result.Append(backslash, slashes * 2 + 1); result.Append('"'); slashes = 0; }
            else { result.Append(backslash, slashes); result.Append(c); slashes = 0; }
        }
        result.Append(backslash, slashes * 2);
        result.Append('"');
        return result.ToString();
    }

    private static void ThrowLastError(string operation)
    {
        int error = Marshal.GetLastWin32Error();
        throw new Win32Exception(error, operation + " failed (Win32 " + error + ")");
    }
}
