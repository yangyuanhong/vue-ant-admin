$ErrorActionPreference = "Stop"
$PythonExe = if ($args.Count) { $args[0] } else { "python" }
& $PythonExe -m pip uninstall -y paddlepaddle paddlepaddle-gpu
& $PythonExe -m pip install "paddlepaddle-gpu==3.3.1" --index-url "https://www.paddlepaddle.org.cn/packages/stable/cu129/"
& $PythonExe -c "import paddle; assert paddle.device.is_compiled_with_cuda(); paddle.set_device('gpu:0'); print(paddle.__version__, paddle.device.get_device(), paddle.to_tensor([1.0]).numpy())"
