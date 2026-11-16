import sys
import os

try:
    import clr
    print("Python.NET successfully imported!")
except ImportError:
    print("Failed to import Python.NET (clr module).")
    sys.exit(1)

# Add C:\tis to sys.path so pythonnet can find the DLLs
tis_dir = r"C:\tis"
if tis_dir not in sys.path:
    sys.path.append(tis_dir)

try:
    # Try to add references to the ARIS dlls
    clr.AddReference("ARISTopology")
    clr.AddReference("ARISTraffic")
    clr.AddReference("ARISModelling")
    
    try:
        import System
        for asm in System.AppDomain.CurrentDomain.GetAssemblies():
            name = asm.GetName().Name
            if "ARIS" in name:
                print(f"Assembly: {name}")
                for t in asm.GetTypes():
                    if t.IsPublic:
                        print(f"  - {t.Namespace}.{t.Name}")
    except Exception as e:
        print(f"Reflection error: {e}")
        
    print("Successfully loaded ARIS DLL references via Python.NET!")
except Exception as e:
    print(f"Failed to load ARIS DLL references: {e}")
    sys.exit(1)
