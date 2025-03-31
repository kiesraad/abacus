fn main() {
    #[cfg(feature = "memory-serve")]
    memory_serve::load_directory_with_embed("../frontend/dist", true);
}
